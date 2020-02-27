const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus");
const { stringFromUTF8Array, convertMessageBody } = require("../index");
// Define connection string and related Service Bus entity names here

module.exports = function (RED) {
  function AZServiceBusTopicRead(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var msg = {};

    node.debug("Loaded the function");
    const connectionString = RED.nodes.getNode(config.connectionString).connectionString;

    const topicName = config.topicName;
    const subscriptionName = config.subscriptionName;
    const isSessionEnabled = config.isSessionEnabled;
    const maxConcurrentCalls = config.maxConcurrentCalls;
    const sessionId = config.sessionId;

    node.receiveMessages = function (receiver, maxConcurrentCalls, node, msg) {
      try {
        node.status({ fill: "green", shape: "ring", text: "connected" });
        receiver.registerMessageHandler(
          (sbMsg) => {
            msg.sbMsg = sbMsg;
            msg.payload = convertMessageBody(sbMsg);
            node.send(msg);
          },
          (sbErr) => {
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            node.error(sbErr + " ==> handler error. Retrying .... ")
            node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
          },
          {
            'maxConcurrentCalls': maxConcurrentCalls
          }
        );
      } catch (err) {
        node.status({ fill: "red", shape: "ring", text: "disconnected" });
        node.error(err + " Retrying .... ")
        node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
      }
    }

    try {
      if (connectionString && topicName && subscriptionName) {
        node.status({ fill: "red", shape: "ring", text: "disconnected" });
        node.log("Received the connection string config");
        const sbClient = ServiceBusClient.createFromConnectionString(connectionString);
        const subscriptionClient = sbClient.createSubscriptionClient(topicName, subscriptionName);
        var receiver = null;
        if (isSessionEnabled)
          receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete, { 
            'sessionId': sessionId,
            'maxSessionAutoRenewLockDurationInSeconds': 30 });
        else
          receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete);

        node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
      }
    } catch (err) {
      node.error("Error occurred: ==> " + err);
    }

    node.on('close', () => {
      queueClient.close().then(() => {
        sbClient.close();
      }).catch((err) => {
        node.error("error while closing the client" + err);
      });
      node.status({ fill: "red", shape: "ring", text: "disconnected" });
    });

  }
  RED.nodes.registerType("az-service-bus-topic-read", AZServiceBusTopicRead);
}

