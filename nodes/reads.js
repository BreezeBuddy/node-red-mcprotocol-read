module.exports = function (RED) {
  /**
   * MC Reads node implementation for reading data from Mitsubishi PLC
   * @param {Object} config - Node configuration object
   */
  function mcReads(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.connection = RED.nodes.getNode(config.connection);
    node.conStatus = "disconnected";
    node.outputFormat = config.outputFormat || 'json';
    node.errorHandling = config.errorHandling || 'throw';
    node.intervalMs = config.cycleTime || 1000;

    try {
      node.address = typeof config.variables === 'string' ? JSON.parse(config.variables) : config.variables || [];
    } catch (e) {
      node.error('Failed to parse variables configuration: ' + e.message);
      node.address = [];
    }
    
    // Initialize connection status
    node.status({ fill: "red", shape: "ring", text: "disconnected" });

    if (node.connection) {
      node.connection.on('mc-connection-change', changeNodeStatus);
    } else {
      node.status({ fill: "grey", shape: "dot", text: "No Connection" });
    }

    /**
     * Handle connection status changes from the connection node
     * @param {Object} conMsg - Connection message object containing status
     * @param {string} conMsg.connectionStatus - Current connection status ('connected', 'disconnected', 'connecting', 'error')
     * @param {number} conMsg.time - Timestamp when status changed
     */
    function changeNodeStatus(conMsg) {
      let fillColor;
      let shape;
      switch (conMsg.connectionStatus) {
        case "connected":
          fillColor = "green";
          shape = "dot";
          break;
        case "disconnected":
          fillColor = "red";
          shape = "ring";
          break;
        case "connecting":
          fillColor = "green";
          shape = "ring";
          break;
        case "error":
        default:
          fillColor = "red";
          shape = "dot";
          break;
      }
      node.status({
        fill: fillColor,
        shape: shape,
        text: conMsg.connectionStatus
      });
      node.conStatus = conMsg.connectionStatus;
    }

    let timer = setInterval(function() {
      if (node.connection) {
        performRead();
      }
    }, node.intervalMs);

    /**
     * Perform PLC read operation
     * Prepares address array and initiates reading from PLC
     */
    function performRead() {
      if (!node.connection) {
        return;
      }

      // Prepare address array - extract only the name field as address
      const addressArray = node.address.map(addr => addr.name).filter(name => name && name.trim());
      
      if (addressArray.length === 0) {
        node.warn("No valid addresses provided for reading.");
        return;
      }

      try{
        node.connection.readDataByAddressArray(addressArray, valuesReady);
      }catch{

      }
    }

    /**
     * Callback function called when PLC read operation completes
     * @param {string|null} anythingBad - Error message if any, null if successful
     * @param {any} values - Data values read from PLC
     */
    function valuesReady(anythingBad, values) {
      let msg = {
        timestamp: Date.now(),
        topic: "mc-read"
      };
      
      if (anythingBad) { 
        // Check if it's a connection-related issue
        const errorStr = anythingBad.toString().toLowerCase();
        if (errorStr.includes('not connected') || 
            errorStr.includes('connection') || 
            errorStr.includes('disconnected') ||
            errorStr.includes('timeout')) {
          
          // Update local status
          node.conStatus = 'disconnected';
          node.status({ fill: "red", shape: "ring", text: "Connection Lost" });
        }
        
        handleError("An error occurred while reading values from plc", anythingBad, msg);
        return;
      }
      
      // If read is successful and previous status was not connected, update to connected
      if (node.conStatus !== 'connected') {
        node.conStatus = 'connected';
        node.status({ fill: "green", shape: "ring", text: "connected" });
      }
      
      const addressArray = node.address.map(addr => addr.name).filter(name => name && name.trim());
      
      // Data validation
      if (!values || (Array.isArray(values) && values.length === 0)) {
        node.warn("Received empty or null values from PLC");
        msg.payload = node.outputFormat === 'json' ? {} : [];
        node.send(msg);
        return;
      }
      
      // Data processing logic
      const isValuesArray = Array.isArray(values);
      const isValuesObject = typeof values === 'object' && values !== null && !isValuesArray;
      
      if (node.outputFormat === 'json') {
        // JSON format - create address name to value mapping (single object)
        const result = {};
        
        if (isValuesArray) {
          // If it's an array, map to address names
          addressArray.forEach((addr, index) => {
            result[addr] = values[index] !== undefined ? values[index] : null;
          });
        } else if (isValuesObject) {
          // If it's already an object, use it directly
          Object.assign(result, values);
        } else {
          // Handle single value case
          if (addressArray.length > 0) {
            result[addressArray[0]] = values;
          }
        }
        
        msg.payload = result;
      } else {
        // Array format - create object array with one object per address
        const result = [];
        
        if (isValuesArray) {
          // If it's an array, create separate objects for each address
          addressArray.forEach((addr, index) => {
            const obj = {};
            obj[addr] = values[index] !== undefined ? values[index] : null;
            result.push(obj);
          });
        } else if (isValuesObject) {
          // If values is already an object, convert each property to separate object
          Object.keys(values).forEach(key => {
            const obj = {};
            obj[key] = values[key];
            result.push(obj);
          });
        } else {
          // Handle single value case
          if (addressArray.length > 0) {
            const obj = {};
            obj[addressArray[0]] = values;
            result.push(obj);
          }
        }
        
        msg.payload = result;
      }
      // if(msg.payload == null || msg.payload == undefined){
      //   node.log("values:" + JSON.stringify(values));
      // }
      node.send(msg);
    }

    /**
     * Handle error messages based on configured error handling mode
     * @param {string} message - Error message description
     * @param {Error|string} error - Error object or error string
     * @param {Object} msg - Message object to send
     */
    function handleError(message, error, msg) {
      const errorMsg = `${message}: ${error}`;
      
      switch (node.errorHandling) {
        case 'msg':
          msg.error = errorMsg;
          msg.payload = null;
          node.send(msg);
          break;
        // TO DO: Implement separate output handling
        // case 'output2':
        //   node.send([null, { payload: errorMsg, error: true, timestamp: Date.now() }]);
        //   break;
        case 'throw':
        default:
          node.error(errorMsg);
          break;
      }
      //changeNodeStatus("disconnected");
    }

    // Clean up when node is closed
    node.on('close', function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (node.connection) {
        node.connection.removeAllListeners('mc-connection-change');
      }
    });
  }
  RED.nodes.registerType("MC Reads", mcReads);
}