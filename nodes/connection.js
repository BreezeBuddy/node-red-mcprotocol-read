const MCProtocol = require('mcprotocol');

module.exports = function(RED) {
    /**
     * MC PLC Connection node for managing Mitsubishi PLC connections
     * @param {Object} config - Node configuration object
     */
    function mcConnectionNode(config) {
        RED.nodes.createNode(this,config);
        const node = this;

        // Connection state management
        node.conStatus = "disconnected";
        node.isBusy = false;
        node.mcprotocol = new MCProtocol();
        node.mcprotocol.globalTimeout = config.timeout || 4500;
        node.reconnectDelay = 1000;

        // Event management
        function onConnectionChange(conStatus) { 
            if (node.conStatus != conStatus) {
                // node.log(`Connection status changed: ${node.conStatus} -> ${conStatus}`);
                node.conStatus = conStatus;
                node.emit('mc-connection-change', {
                    connectionStatus: conStatus,
                    time: Date.now()
                });
            }
        }

        node.mcprotocol.connectError = enhancedMCProtocolErrorHandling(node.mcprotocol.connectError, reconnect);

        /**
         * Enhanced error handling wrapper for MCProtocol connection errors
         * @param {Function} connectError - Original connect error function
         * @param {Function} userCallback - User callback for reconnection
         * @returns {Function} Enhanced error handler
         */
        function enhancedMCProtocolErrorHandling(connectError, userCallback) {
            return function(err) {
                node.error('PLC Connection error:' + err.message);
                onConnectionChange('error');
                connectError(err);
                // node.log('Reconnecting in 1 seconds...');
                setTimeout(() => {
                    userCallback();
                }, node.reconnectDelay);
            };
        }

        /**
         * Reconnect to PLC after connection failure
         */
        function reconnect() {
            if(node.conStatus !== "connecting") {
                onConnectionChange("connecting");
                try{
                    node.mcprotocol.dropConnection();
                    // node.log('Attempting to reconnect......');
                    node.mcprotocol.initiateConnection(node.connectionParams, connectCallback);}
                catch (error) {
                    node.error('Failed to initiate connection: ' + error.message);
                    onConnectionChange('disconnected');
                }
            }
        }

        // Connection parameters
        node.connectionParams = {
            host: config.host,
            port: config.port,
            protocol: config.protocol || 'TCP',
            plcType: config.plcType || 'Q',
            frame: config.frame || '1E',
            ascii: config.communication === 'binary' ? false : true,
            octalInputOutput: config.octalInputOutput === 'decimal' ? false : true,
            timeout: config.timeout || 1000
        };

        /**
         * Handle connection status changes based on MCProtocol state
         */
        function handleConnectionStatus() {
            const status = node.mcprotocol.isoConnectionState;
            switch (status) {
                case 0: // disconnected
                    onConnectionChange('disconnected');
                    scheduleReconnect();
                    break;
                case 1: // connecting
                    onConnectionChange('connecting');
                    break;
                case 4: // connected
                    onConnectionChange('connected');
                    clearReconnect();
                    break;
                default:
                    onConnectionChange('error');
                    scheduleReconnect();
            }
        }

        connectToPLC();

        /**
         * Initialize connection to PLC
         */
        function connectToPLC() {
            if(node.conStatus !== "connected" && node.conStatus !== "connecting") {
                node.mcprotocol.dropConnection();
                onConnectionChange("connecting");
                node.mcprotocol.initiateConnection(node.connectionParams, connectCallback);
            }
        }

        /**
         * Callback function for connection establishment
         * @param {*} result - Connection result (undefined means success)
         */
        function connectCallback(result) {
            if (typeof result !== "undefined") {
                onConnectionChange('disconnected');
                return;
            }
            onConnectionChange('connected');
        }
        

        // Read queue mechanism
        node.readQueue = [];
        /**
         * Read data from PLC by address array with queue management
         * @param {string[]} addressArray - Array of PLC addresses to read
         * @param {Function} valuesReady - Callback function when values are ready
         */
        node.readDataByAddressArray = function(addressArray, valuesReady) {
            const request = { addressArray, valuesReady };
            if (node.isBusy) {
                node.readQueue.push(request);
                return;
            }
            doRead(request);
        };

        /**
         * Execute a single read operation with timeout protection
         * @param {Object} request - Read request containing addressArray and valuesReady callback
         */
        function doRead(request) {
            node.isBusy = true;
            const { addressArray, valuesReady } = request;
            const timeoutMs = (typeof node.mcprotocol.globalTimeout === 'number' ? node.mcprotocol.globalTimeout : 4500);
            let timeoutHit = false;

            // Check connection status
            if (node.mcprotocol.isoConnectionState !== 4) {
                onConnectionChange('disconnected');
                node.isBusy = false;
                valuesReady('Connection not available', null);
                // Continue processing queue
                if (node.readQueue.length > 0) {
                    const next = node.readQueue.shift();
                    setImmediate(() => doRead(next));
                }
                return;
            }

            // node.log("Adding values from PLC:" + JSON.stringify(addressArray));
            node.mcprotocol.addItems(addressArray);
            // node.log("Finished Adding values from PLC:" + JSON.stringify(addressArray));

            // Set timeout timer
            const timeoutId = setTimeout(() => {
                timeoutHit = true;
                node.isBusy = false;
                try {
                    node.mcprotocol.removeItems(addressArray);
                } catch (error) {
                    console.warn('Error removing items:', error);
                }
                valuesReady('Read operation timed out', null);
                // node.log("Read operation timed out for: " + JSON.stringify(addressArray));
                onConnectionChange('disconnected');
                // Continue processing queue after timeout
                if (node.readQueue.length > 0) {
                    const next = node.readQueue.shift();
                    setImmediate(() => doRead(next));
                }
            }, timeoutMs);

            // Wrap original callback function to remove items after completion
            const wrappedCallback = function(anythingBad, values) {
                if (timeoutHit) return; // Already timed out, don't process again
                clearTimeout(timeoutId);
                node.isBusy = false;
                // Check error type to determine if it's a connection issue
                if (anythingBad) {
                    const errorStr = anythingBad.toString().toLowerCase();
                    if (errorStr.includes('not connected') || 
                        errorStr.includes('connection') || 
                        errorStr.includes('disconnected') ||
                        errorStr.includes('timeout')) {
                        onConnectionChange('disconnected');
                    }
                }

                // Remove items first (regardless of success or failure)
                try {
                    node.mcprotocol.removeItems(addressArray);
                } catch (error) {
                    console.warn('Error removing items:', error);
                }
                // Then call the original callback function
                valuesReady(anythingBad, values);
                // node.log("Finished Reading values from PLC:" + JSON.stringify(addressArray));
                // Continue processing queue after read completion
                if (node.readQueue.length > 0) {
                    const next = node.readQueue.shift();
                    setImmediate(() => doRead(next));
                }
            };
            // node.log("Reading values from PLC:" + JSON.stringify(addressArray));
            node.mcprotocol.readAllItems(wrappedCallback);
        }

        node.on('close', function () {
            if (node.mcprotocol) {
                node.mcprotocol.dropConnection();
                onConnectionChange('disconnected');
            }
            node.removeAllListeners();
        });
    }
    RED.nodes.registerType("MC PLC Connection",mcConnectionNode);
}