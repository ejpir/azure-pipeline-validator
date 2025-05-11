/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.YAMLDocument = exports.SingleYAMLDocument = void 0;
var jsonParser_1 = require("./jsonParser");
var nls = require("vscode-nls");
var localize = nls.loadMessageBundle();
var Yaml = require("yaml-ast-parser");
var js_yaml_1 = require("js-yaml");
var documentPositionCalculator_1 = require("../utils/documentPositionCalculator");
var SingleYAMLDocument = /** @class */ (function (_super) {
    __extends(SingleYAMLDocument, _super);
    function SingleYAMLDocument(lines) {
        var _this = _super.call(this, null, []) || this;
        _this.getNodeByIndent = function (lines, offset, node) {
            var offsetPosition = (0, documentPositionCalculator_1.getPosition)(offset, _this.lines);
            function findNode(children) {
                for (var idx = 0; idx < children.length; idx++) {
                    var child = children[idx];
                    var childPosition = (0, documentPositionCalculator_1.getPosition)(child.start, lines);
                    if (childPosition.column > offsetPosition.column) {
                        return null;
                    }
                    var foundNode = findNode(child.getChildNodes());
                    if (foundNode) {
                        return foundNode;
                    }
                    // We have the right indentation, need to return based on line
                    if (childPosition.line == offsetPosition.line) {
                        return child;
                    }
                    if (childPosition.line > offsetPosition.line) {
                        // Get previous
                        (idx - 1) >= 0 ? children[idx - 1] : child;
                    }
                    // Else continue loop to try next element
                }
                // Special case, we found the correct
                return children[children.length - 1];
            }
            return findNode(node.getChildNodes()) || node;
        };
        _this.lines = lines;
        _this.root = null;
        _this.errors = [];
        _this.warnings = [];
        return _this;
    }
    SingleYAMLDocument.prototype.getNodeFromOffset = function (offset) {
        return this.getNodeFromOffsetEndInclusive(offset);
    };
    return SingleYAMLDocument;
}(jsonParser_1.JSONDocument));
exports.SingleYAMLDocument = SingleYAMLDocument;
function recursivelyBuildAst(parent, node) {
    if (!node) {
        return;
    }
    switch (node.kind) {
        case Yaml.Kind.MAP: {
            var instance = node;
            var result = new jsonParser_1.ObjectASTNode(parent, null, node.startPosition, node.endPosition);
            addPropertiesToObjectNode(result, instance.mappings);
            return result;
        }
        case Yaml.Kind.MAPPING: {
            var instance = node;
            var key = instance.key;
            // Technically, this is an arbitrary node in YAML
            // I doubt we would get a better string representation by parsing it
            var keyNode = new jsonParser_1.StringASTNode(null, null, true, key.startPosition, key.endPosition);
            keyNode.value = key.value;
            var result = new jsonParser_1.PropertyASTNode(parent, keyNode);
            result.end = instance.endPosition;
            var valueNode = (instance.value) ? recursivelyBuildAst(result, instance.value) : new jsonParser_1.NullASTNode(parent, key.value, instance.endPosition, instance.endPosition);
            valueNode.location = key.value;
            result.setValue(valueNode);
            return result;
        }
        case Yaml.Kind.SEQ: {
            var instance = node;
            var result = new jsonParser_1.ArrayASTNode(parent, null, instance.startPosition, instance.endPosition);
            addItemsToArrayNode(result, instance.items);
            return result;
        }
        case Yaml.Kind.SCALAR: {
            var instance = node;
            var type = Yaml.determineScalarType(instance);
            // The name is set either by the sequence or the mapping case.
            var name_1 = null;
            var value = instance.value;
            //This is a patch for redirecting values with these strings to be boolean nodes because its not supported in the parser.
            var possibleBooleanValues = ['y', 'Y', 'yes', 'Yes', 'YES', 'n', 'N', 'no', 'No', 'NO', 'on', 'On', 'ON', 'off', 'Off', 'OFF'];
            if (possibleBooleanValues.indexOf(value.toString()) !== -1) {
                return new jsonParser_1.BooleanASTNode(parent, name_1, value, node.startPosition, node.endPosition);
            }
            switch (type) {
                case Yaml.ScalarType.null: {
                    return new jsonParser_1.StringASTNode(parent, name_1, false, instance.startPosition, instance.endPosition);
                }
                case Yaml.ScalarType.bool: {
                    return new jsonParser_1.BooleanASTNode(parent, name_1, Yaml.parseYamlBoolean(value), node.startPosition, node.endPosition);
                }
                case Yaml.ScalarType.int: {
                    var result = new jsonParser_1.NumberASTNode(parent, name_1, node.startPosition, node.endPosition);
                    result.value = Yaml.parseYamlInteger(value);
                    result.isInteger = true;
                    return result;
                }
                case Yaml.ScalarType.float: {
                    var result = new jsonParser_1.NumberASTNode(parent, name_1, node.startPosition, node.endPosition);
                    result.value = Yaml.parseYamlFloat(value);
                    result.isInteger = false;
                    return result;
                }
                case Yaml.ScalarType.string: {
                    var result = new jsonParser_1.StringASTNode(parent, name_1, false, node.startPosition, node.endPosition);
                    result.value = node.value;
                    return result;
                }
            }
            break;
        }
        case Yaml.Kind.ANCHOR_REF: {
            var instance = node.value;
            return recursivelyBuildAst(parent, instance) ||
                new jsonParser_1.NullASTNode(parent, null, node.startPosition, node.endPosition);
        }
        case Yaml.Kind.INCLUDE_REF: {
            var result = new jsonParser_1.StringASTNode(parent, null, false, node.startPosition, node.endPosition);
            result.value = node.value;
            return result;
        }
    }
}
// These two helper functions exist to add support for compile-time expressions.
// Basically, they just hoist the entries under the expression to its parent
// and remove the expression from the parsed YAML.
function addPropertiesToObjectNode(node, properties) {
    var _a;
    for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
        var property = properties_1[_i];
        if (isCompileTimeExpression(property)) {
            // Ensure we have a value (object) _and_ that the value has mappings (properties).
            if (((_a = property.value) === null || _a === void 0 ? void 0 : _a.mappings) !== undefined) {
                addPropertiesToObjectNode(node, property.value.mappings);
            }
        }
        else {
            node.addProperty(recursivelyBuildAst(node, property));
        }
    }
}
function addItemsToArrayNode(node, items) {
    var count = 0;
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        // TODO: What the heck is this check
        if (item === null && count === items.length - 1) {
            break;
        }
        var itemNode = void 0;
        if (item === null) {
            // Be aware of https://github.com/nodeca/js-yaml/issues/321
            // Cannot simply work around it here because we need to know if we are in Flow or Block
            itemNode = new jsonParser_1.NullASTNode(node.parent, null, node.end, node.end);
        }
        else {
            // Hoisted expressions must be the first (and only) property in an object,
            // so we can safely check only the first key.
            // TODO: Confirm the above statement.
            if (item.kind === Yaml.Kind.MAP && item.mappings.length > 0 && isCompileTimeExpression(item.mappings[0])) {
                var value = item.mappings[0].value;
                if (value === null) {
                    // Incomplete object: they're still working on the value :).
                    // e.g. - ${{ if eq(variables['Build.SourceBranch'], 'main') }}:
                    // with nothing (yet) after the colon.
                    continue;
                }
                if (value.kind === Yaml.Kind.SEQ) {
                    // e.g. conditionally adding steps to a job.
                    // - ${{ if eq(variables['Build.SourceBranch'], 'main') }}: <-- current item in the sequence
                    //                                                        ^ it's a map (object)
                    //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the first key is an expression
                    //   - pwsh: echo 'Hi'
                    //   ^^^^^^^^^^^^^^^^^ the first item in the sequence (array)
                    addItemsToArrayNode(node, value.items);
                    count++;
                    continue;
                }
                else if (value.kind === Yaml.Kind.MAP) {
                    // e.g. looping through a stepList parameter and checking each value.
                    // - ${{ each step in userSteps }}:
                    //   - ${{ each pair in step }}: <-- current item in the sequence
                    //                             ^ it's a map (object)
                    //     ^^^^^^^^^^^^^^^^^^^^^^^^ the first key is an expression
                    //     ${{ pair.key }}: ${{ pair.value }}
                    //     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the first mapping (property) in the map (object)
                    // NOTE: We don't have a great story for this as we can't validate
                    // the resulting ${{ pair.key }}: ${{ pair.value }} against the schema,
                    // so we currently just create an empty object with no properties.
                    // We might need to revisit this if we start providing LSP capabilities
                    // for expressions.
                    itemNode = recursivelyBuildAst(node, value);
                }
                else if (value.kind === Yaml.Kind.SCALAR) {
                    // False positive: no children. Add the item directly just like in the no-expression case.
                    // e.g. looping through an array parameter and using each one as a key or value.
                    // - ${{ each shorthand in parameters.taskShorthands }}:
                    //   - ${{ shorthand }}: echo 'Hi' <-- current item in the sequence
                    //                     ^ it's a map (object)
                    //     ^^^^^^^^^^^^^^^^ the first key is an expression
                    //                       ^^^^^^^^^ but the value is just a scalar, no children
                    itemNode = recursivelyBuildAst(node, item);
                }
                else {
                    throw new Error("Unexpected kind " + value.kind);
                }
            }
            else {
                itemNode = recursivelyBuildAst(node, item);
            }
        }
        itemNode.location = node.items.length;
        node.addItem(itemNode);
        count++;
    }
}
function isCompileTimeExpression(node) {
    return node.key.kind === Yaml.Kind.SCALAR &&
        node.key.value.startsWith("${{") &&
        node.key.value.endsWith("}}");
}
function convertError(e) {
    return { getMessage: function () { return e.reason; }, start: e.mark.position, end: e.mark.position + e.mark.column };
}
function createJSONDocument(yamlNode, startPositions, text) {
    var _doc = new SingleYAMLDocument(startPositions);
    _doc.root = recursivelyBuildAst(null, yamlNode);
    if (!_doc.root) {
        // TODO: When this is true, consider not pushing the other errors.
        _doc.errors.push({ getMessage: function () { return localize('Invalid symbol', 'Expected a YAML object, array or literal'); }, start: yamlNode.startPosition, end: yamlNode.endPosition });
    }
    var duplicateKeyReason = 'duplicate key';
    //Patch ontop of yaml-ast-parser to disable duplicate key message on merge key
    var isDuplicateAndNotMergeKey = function (error, yamlText) {
        var errorConverted = convertError(error);
        var errorStart = errorConverted.start;
        var errorEnd = errorConverted.end;
        if (error.reason === duplicateKeyReason && yamlText.substring(errorStart, errorEnd).startsWith("<<")) {
            return false;
        }
        return true;
    };
    var errors = yamlNode.errors.filter(function (e) { return e.reason !== duplicateKeyReason && !e.isWarning; }).map(function (e) { return convertError(e); });
    var warnings = yamlNode.errors.filter(function (e) { return (e.reason === duplicateKeyReason && isDuplicateAndNotMergeKey(e, text)) || e.isWarning; }).map(function (e) { return convertError(e); });
    errors.forEach(function (e) { return _doc.errors.push(e); });
    warnings.forEach(function (e) { return _doc.warnings.push(e); });
    return _doc;
}
var YAMLDocument = /** @class */ (function () {
    function YAMLDocument(documents) {
        this.documents = documents;
        this.errors = [];
        this.warnings = [];
    }
    return YAMLDocument;
}());
exports.YAMLDocument = YAMLDocument;
function parse(text, customTags) {
    if (customTags === void 0) { customTags = []; }
    var startPositions = (0, documentPositionCalculator_1.getLineStartPositions)(text);
    // This is documented to return a YAMLNode even though the
    // typing only returns a YAMLDocument
    var yamlDocs = [];
    var schemaWithAdditionalTags = js_yaml_1.Schema.create(customTags.map(function (tag) {
        var typeInfo = tag.split(' ');
        return new js_yaml_1.Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
    }));
    //We need compiledTypeMap to be available from schemaWithAdditionalTags before we add the new custom properties
    customTags.map(function (tag) {
        var typeInfo = tag.split(' ');
        schemaWithAdditionalTags.compiledTypeMap[typeInfo[0]] = new js_yaml_1.Type(typeInfo[0], { kind: typeInfo[1] || 'scalar' });
    });
    var additionalOptions = {
        schema: schemaWithAdditionalTags
    };
    Yaml.loadAll(text, function (doc) { return yamlDocs.push(doc); }, additionalOptions);
    return new YAMLDocument(yamlDocs.map(function (doc) { return createJSONDocument(doc, startPositions, text); }));
}
exports.parse = parse;
//# sourceMappingURL=yamlParser.js.map