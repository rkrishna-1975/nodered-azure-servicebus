module.exports = function(RED) {
    function AZServiceBusConfig(config) {
        RED.nodes.createNode(this,config);
        this.connectionString = config.connectionString;
    }
    RED.nodes.registerType("az-sb-config",AZServiceBusConfig);
}