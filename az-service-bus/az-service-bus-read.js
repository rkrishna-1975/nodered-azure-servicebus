const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus");
const { stringFromUTF8Array, convertMessageBody } = require("../index");

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

    node.receiveMessages = function (receiver, maxConcurrentCalls, node, msg) {
      try {
        node.status({ fill: "green", shape: "ring", text: "connected" });
        receiver.registerMessageHandler(
          //https://docs.microsoft.com/en-us/javascript/api/@azure/service-bus/receiver?view=azure-node-latest#registermessagehandler-onmessage--onerror--messagehandleroptions-
          (sbMsg) => {
            msg.sbMsg = sbMsg;
            msg.payload = convertMessageBody(sbMsg);
            node.debug("received content type: " + sbMsg.contentType);
            node.send(msg);
          },
          (sbErr) => {
            node.error("Error occured in message handler ==> " + sbErr);
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
          },
          {
            //default configuration                    
            //https://docs.microsoft.com/en-us/javascript/api/@azure/service-bus/messagehandleroptions?view=azure-node-latest
            'maxConcurrentCalls': maxConcurrentCalls
          }
        );
      } catch (err) {
        node.error("Error occured in message handler ==> " + sbErr);
        node.status({ fill: "red", shape: "ring", text: "disconnected" });
        node.receiveMessages(receiver, maxConcurrentCalls, node, msg);
      }
    }

    try {
      if (connectionString && queueName) {
        
        node.debug("Received the connection string config");
        const sbClient = ServiceBusClient.createFromConnectionString(connectionString);
        const queueClient = sbClient.createQueueClient(queueName);
        var receiver = null;
        if (isSessionEnabled)
          receiver = queueClient.createReceiver(ReceiveMode.receiveAndDelete, { 'maxSessionAutoRenewLockDurationInSeconds': 30 });
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
