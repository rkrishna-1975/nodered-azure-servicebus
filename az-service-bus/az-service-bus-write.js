const { ServiceBusClient } = require("@azure/service-bus");

module.exports = function(RED) {
    function AZServiceBusWrite(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        const connectionString = RED.nodes.getNode(config.connectionString).connectionString;;
        const queueName = config.queueName; 

        const sbClient = ServiceBusClient.createFromConnectionString(connectionString); 
        const queueClient = sbClient.createQueueClient(queueName);
        const sender = queueClient.createSender();

        node.on('input', function(msg) {
            var message = {
                'body': msg.payload
            }
            if (msg.payload instanceof Object)
                message.contentType='application/json';
            if (msg.messageProperties) {
                Object.assign(message,msg.messageProperties);
            }
            try {
                sender.send(message).then((data)=> {
                    // node.debug(data);
                    msg.payload = data;
                    node.send([msg,null]);
                    // node.done();
                }).catch((err) => {
                    // node.error(err);
                    msg.error=err;
                    node.send([null, msg]);
                    // node.done();
                });
            } catch (err) {
                node.error("error while writing to the bus" + err);
                // msg.error=err;
                // node.send([null, msg]);
                // node.done();
            }
            
        });

        node.on('close', function() {
            queueClient.close(() => {
                sbClient.close();
            });
        })
    }
    RED.nodes.registerType("az-service-bus-write",AZServiceBusWrite);
}