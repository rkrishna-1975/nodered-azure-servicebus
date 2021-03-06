const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus");
const Utils = require("../index");

// Define connection string and related Service Bus entity names here


module.exports = function (RED) {
  function AZServiceBusRead(config) {
    var msg = {};

    RED.nodes.createNode(this, config);
    var node = this;
    node.debug("Loaded the function");
    const connectionString = RED.nodes.getNode(config.connectionString).connectionString;
    const queueName = config.queueName;
    const isSessionEnabled = config.isSessionEnabled;
    const maxConcurrentCalls = config.maxConcurrentCalls;
    const sessionId = config.sessionId;
    const utils = new Utils();

    node.receiveMessages = function  (receiver, maxConcurrentCalls, node, msg) {
      try {
        node.status({ fill: "green", shape: "ring", text: "connected" });
        receiver.registerMessageHandler(
          (sbMsg) => {
            msg.sbMsg = sbMsg;
            msg.payload = utils.convertMessageBody(sbMsg);
            node.debug("received content type: " + sbMsg.contentType);
            node.send(msg);
          },
          (sbErr) => {
            node.error("Error occured in message handler ==> " + sbErr);
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            utils.retry(node.receiveMessages, [receiver, maxConcurrentCalls, node, msg],5,node)
          },
          {
            'maxConcurrentCalls': maxConcurrentCalls
          }
        );
      } catch (err) {
        node.error("Error occured in message handler ==> " + sbErr);
        node.status({ fill: "red", shape: "ring", text: "disconnected" });
        utils.retry(node.receiveMessages, [receiver, maxConcurrentCalls, node, msg],5,node)
      }
    }

    try {
      if (connectionString && queueName) {
        
        node.debug("Received the connection string config");
        const sbClient = ServiceBusClient.createFromConnectionString(connectionString);
        const queueClient = sbClient.createQueueClient(queueName);
        var receiver = null;
        if (isSessionEnabled)
          receiver = queueClient.createReceiver(ReceiveMode.receiveAndDelete, { 
            'sessionId' : sessionId,
            'maxSessionAutoRenewLockDurationInSeconds': 30 });
        else
          receiver = queueClient.createReceiver(ReceiveMode.receiveAndDelete);

        node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
      }
    } catch (err) {
      node.error("Error occurred: ==> " + err);
      node.status({ fill: "red", shape: "ring", text: "disconnected" });
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
  RED.nodes.registerType("az-service-bus-read", AZServiceBusRead);
}
