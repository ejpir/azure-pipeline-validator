'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAMLTraversal = void 0;
var Parser = require("../parser/jsonParser");
var YAMLTraversal = /** @class */ (function () {
    function YAMLTraversal(promiseConstructor) {
        this.promise = promiseConstructor || Promise;
    }
    YAMLTraversal.prototype.findNodes = function (document, yamlDocument, key) {
        if (!document) {
            this.promise.resolve([]);
        }
        var jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if (jsonDocument === null) {
            return this.promise.resolve([]);
        }
        var nodes = [];
        jsonDocument.visit((function (node) {
            var propertyNode = node;
            if (propertyNode.key && propertyNode.key.value === key) {
                nodes.push({
                    startPosition: document.positionAt(node.parent.start),
                    endPosition: document.positionAt(node.parent.end),
                    key: propertyNode.key.value,
                    value: propertyNode.value.getValue()
                });
            }
            return true;
        }));
        return this.promise.resolve(nodes);
    };
    YAMLTraversal.prototype.getNodePropertyValues = function (document, yamlDocument, position, propertyName) {
        if (!document) {
            return { values: null };
        }
        var offset = document.offsetAt(position);
        var jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if (jsonDocument === null) {
            return { values: null };
        }
        // get the node by position and then walk up until we find an object node with properties
        var node = jsonDocument.getNodeFromOffset(offset);
        while (node !== null && !(node instanceof Parser.ObjectASTNode)) {
            node = node.parent;
        }
        if (!node) {
            return { values: null };
        }
        // see if this object has an inputs property
        var propertiesArray = node.properties.filter(function (p) { return p.key.value === propertyName; });
        if (!propertiesArray || propertiesArray.length !== 1) {
            return { values: null };
        }
        // get the values contained within inputs
        var valueMap = {};
        var parameterValueArray = propertiesArray[0].value.properties;
        parameterValueArray && parameterValueArray.forEach(function (p) {
            valueMap[p.key.value] = p.value.getValue();
        });
        return {
            values: valueMap
        };
    };
    return YAMLTraversal;
}());
exports.YAMLTraversal = YAMLTraversal;
//# sourceMappingURL=yamlTraversal.js.map