/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAMLCompletion = void 0;
var Parser = require("../parser/jsonParser");
var Json = require("jsonc-parser");
var yamlServiceUtils_1 = require("../utils/yamlServiceUtils");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var nls = require("vscode-nls");
var localize = nls.loadMessageBundle();
var YAMLCompletion = /** @class */ (function () {
    function YAMLCompletion(schemaService, contributions, promiseConstructor) {
        if (contributions === void 0) { contributions = []; }
        this.schemaService = schemaService;
        this.contributions = contributions;
        this.promise = promiseConstructor || Promise;
        this.customTags = [];
    }
    YAMLCompletion.prototype.configure = function (customTags) {
        this.customTags = customTags;
    };
    YAMLCompletion.prototype.doResolve = function (item) {
        for (var i = this.contributions.length - 1; i >= 0; i--) {
            if (this.contributions[i].resolveCompletion) {
                var resolver = this.contributions[i].resolveCompletion(item);
                if (resolver) {
                    return resolver;
                }
            }
        }
        return this.promise.resolve(item);
    };
    YAMLCompletion.prototype.doComplete = function (document, position, yamlDocument) {
        var _this = this;
        var result = {
            items: [],
            isIncomplete: false
        };
        var offset = document.offsetAt(position);
        if (document.getText()[offset] === ":") {
            return Promise.resolve(result);
        }
        var jsonDocument = yamlDocument.documents.length > 0 ? yamlDocument.documents[0] : null;
        if (jsonDocument === null) {
            return Promise.resolve(result);
        }
        var node = jsonDocument.getNodeFromOffsetEndInclusive(offset);
        if (this.isInComment(document, node ? node.start : 0, offset)) {
            return Promise.resolve(result);
        }
        //console.log(JSON.pruned(node));
        var currentWord = this.getCurrentWord(document, offset);
        var overwriteRange = null;
        if (node && node.type === 'null') {
            //console.log('type = null');
            var nodeStartPos = document.positionAt(node.start);
            nodeStartPos.character += 1;
            var nodeEndPos = document.positionAt(node.end);
            nodeEndPos.character += 1;
            overwriteRange = vscode_languageserver_types_1.Range.create(nodeStartPos, nodeEndPos);
        }
        else if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean')) {
            //console.log('type = string | nuber | boolean');      
            overwriteRange = this.getRangeForLiteralProperties(document, node);
        }
        else {
            //console.log('else');
            var overwriteStart = offset - currentWord.length;
            if (overwriteStart > 0 && document.getText()[overwriteStart - 1] === '"') {
                overwriteStart--;
            }
            overwriteRange = vscode_languageserver_types_1.Range.create(document.positionAt(overwriteStart), position);
        }
        //console.log('overwriteRange: ' + JSON.stringify(overwriteRange));
        var proposed = {};
        var collector = {
            add: function (suggestion) {
                var existing = proposed[suggestion.label];
                if (!existing) {
                    proposed[suggestion.label] = suggestion;
                    if (overwriteRange) {
                        suggestion.textEdit = vscode_languageserver_types_1.TextEdit.replace(overwriteRange, suggestion.insertText);
                    }
                    result.items.push(suggestion);
                }
                else if (!existing.documentation) {
                    existing.documentation = suggestion.documentation;
                }
            },
            setAsIncomplete: function () {
                result.isIncomplete = true;
            },
            error: function (message) {
                console.error(message);
            },
            log: function (message) {
                console.log(message);
            },
            getNumberOfProposals: function () {
                return result.items.length;
            }
        };
        //console.log('document.uri: ' + JSON.stringify(document.uri));
        return this.schemaService.getSchemaForResource(document.uri).then(function (schema) {
            //console.log('start');
            //console.log('schema: ' + JSON.stringify(schema));
            if (!schema) {
                return Promise.resolve(result);
            }
            var collectionPromises = [];
            var addValue = true;
            var currentProperty = null;
            if (node) {
                if (node.type === 'string') {
                    var stringNode = node;
                    if (stringNode.isKey) {
                        addValue = !(node.parent && (node.parent.value));
                        currentProperty = node.parent ? node.parent : null;
                        // currentKey = document.getText().substring(node.start + 1, node.end - 1);
                        if (node.parent) {
                            node = node.parent.parent;
                        }
                    }
                }
            }
            // proposals for properties
            //console.log('node and node object');
            if (node && node.type === 'object') {
                // don't suggest properties that are already present
                var properties = node.properties;
                properties.forEach(function (p) {
                    if (!currentProperty || currentProperty !== p) {
                        proposed[p.key.value] = vscode_languageserver_types_1.CompletionItem.create('__');
                    }
                });
                var separatorAfter = '';
                if (addValue) {
                    separatorAfter = _this.evaluateSeparatorAfter(document, document.offsetAt(overwriteRange.end));
                }
                if (schema) {
                    // property proposals with schema
                    _this.getPropertyCompletions(schema, jsonDocument, node, addValue, collector, separatorAfter);
                }
                var location_1 = node.getPath();
                _this.contributions.forEach(function (contribution) {
                    var collectPromise = contribution.collectPropertyCompletions(document.uri, location_1, currentWord, addValue, false, collector);
                    if (collectPromise) {
                        collectionPromises.push(collectPromise);
                    }
                });
                if ((!schema && currentWord.length > 0 && document.getText().charAt(offset - currentWord.length - 1) !== '"')) {
                    collector.add({
                        kind: vscode_languageserver_types_1.CompletionItemKind.Property,
                        label: _this.getLabelForValue(currentWord),
                        insertText: _this.getInsertTextForProperty(currentWord, null, false, separatorAfter),
                        insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
                        documentation: ''
                    });
                }
            }
            // proposals for values
            var types = {};
            //console.log('schema: ' + JSON.stringify(schema));
            if (schema) {
                _this.getValueCompletions(schema, jsonDocument, node, offset, document, collector, types);
            }
            if (_this.contributions.length > 0) {
                _this.getContributedValueCompletions(jsonDocument, node, offset, document, collector, collectionPromises);
            }
            if (_this.customTags.length > 0) {
                _this.getCustomTagValueCompletions(collector);
            }
            return _this.promise.all(collectionPromises).then(function () {
                return result;
            });
        });
    };
    YAMLCompletion.prototype.getRangeForLiteralProperties = function (document, node) {
        var startPosition = document.positionAt(node.start);
        var endPosition = document.positionAt(node.end);
        // when a colon is already written for the property we don't want to insert one more colon,
        // so the first one can be overwritten
        var hasColonRegex = new RegExp(/\w+:/);
        var hasColon = hasColonRegex.test(document.getText().substring(node.start, node.end + 1));
        if (hasColon) {
            endPosition = document.positionAt(node.end + 1);
        }
        // when start and end positions are not on the same line and node is a temporary holder then
        // we must have misplaced the end of the range one line below the start of the range
        // because of the mismatch in line length between the temporary currentDoc with holder and actual document.
        if (startPosition.line + 1 === endPosition.line && endPosition.character === 0 && node.location === yamlServiceUtils_1.nodeHolder) {
            endPosition = document.positionAt(node.end - 1);
        }
        return vscode_languageserver_types_1.Range.create(startPosition, endPosition);
    };
    YAMLCompletion.prototype.arrayIsEmptyOrContainsKey = function (stringArray, key) {
        if (!stringArray || !stringArray.length) {
            return true;
        }
        return !!stringArray.some(function (arrayEntry) { return arrayEntry === key; });
    };
    YAMLCompletion.prototype.getPropertyCompletions = function (schema, doc, node, addValue, collector, separatorAfter) {
        var _this = this;
        var nodeProperties = node.properties;
        var hasMatchingProperty = function (key, propSchema) {
            return nodeProperties.some(function (propertyNode) {
                var propertyKey = propertyNode.key.value;
                if (propertyKey === key) {
                    return true;
                }
                var ignoreCase = Parser.ASTNode.getIgnoreKeyCase(propSchema);
                if (ignoreCase) {
                    propertyKey = propertyKey.toUpperCase();
                    if (propertyKey === key.toUpperCase()) {
                        return true;
                    }
                }
                if (Array.isArray(propSchema.aliases)) {
                    return propSchema.aliases.some(function (alias) {
                        var testAlias = ignoreCase ? alias.toUpperCase() : alias;
                        return testAlias === propertyKey;
                    });
                }
                return false;
            });
        };
        var matchingSchemas = doc.getMatchingSchemas(schema.schema);
        matchingSchemas.forEach(function (s) {
            if (s.node === node && !s.inverted) {
                var schemaProperties_1 = s.schema.properties;
                if (schemaProperties_1) {
                    Object.keys(schemaProperties_1).forEach(function (key) {
                        //check for more than one property because the placeholder will always be in the list
                        if (s.node['properties'].length > 1 || _this.arrayIsEmptyOrContainsKey(s.schema.firstProperty, key)) {
                            var propertySchema = schemaProperties_1[key];
                            if (!propertySchema.deprecationMessage &&
                                !propertySchema["doNotSuggest"] &&
                                !hasMatchingProperty(key, propertySchema)) {
                                collector.add({
                                    kind: vscode_languageserver_types_1.CompletionItemKind.Property,
                                    label: key,
                                    insertText: _this.getInsertTextForProperty(key, propertySchema, addValue, separatorAfter),
                                    insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
                                    documentation: propertySchema.description || ''
                                });
                            }
                        }
                    });
                }
            }
        });
    };
    YAMLCompletion.prototype.getValueCompletions = function (schema, doc, node, offset, document, collector, types) {
        var _this = this;
        var offsetForSeparator = offset;
        var parentKey = null;
        if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean')) {
            offsetForSeparator = node.end;
            node = node.parent;
        }
        if (node && node.type === 'null') {
            var nodeParent = node.parent;
            /*
             * This is going to be an object for some reason and we need to find the property
             * Its an issue with the null node
             */
            if (nodeParent && nodeParent.type === "object") {
                for (var prop in nodeParent["properties"]) {
                    var currNode = nodeParent["properties"][prop];
                    if (currNode.key && currNode.key.location === node.location) {
                        node = currNode;
                    }
                }
            }
        }
        if (!node) {
            this.addSchemaValueCompletions(schema.schema, collector, types, "");
            return;
        }
        if ((node.type === 'property') && offset > node.colonOffset) {
            var propertyNode = node;
            var valueNode = propertyNode.value;
            if (valueNode && offset > valueNode.end) {
                return; // we are past the value node
            }
            parentKey = propertyNode.key.value;
            node = node.parent;
        }
        var separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
        if (node && (parentKey !== null || node.type === 'array')) {
            var matchingSchemas = doc.getMatchingSchemas(schema.schema);
            matchingSchemas.forEach(function (s) {
                if (s.node === node && !s.inverted && s.schema) {
                    if (s.schema.items) {
                        if (Array.isArray(s.schema.items)) {
                            var index = _this.findItemAtOffset(node, document, offset);
                            if (index < s.schema.items.length) {
                                _this.addSchemaValueCompletions(s.schema.items[index], collector, types, separatorAfter);
                            }
                        }
                        else {
                            _this.addSchemaValueCompletions(s.schema.items, collector, types, separatorAfter);
                        }
                    }
                    if (s.schema.properties) {
                        //console.log('property schema');
                        var propertySchema = s.schema.properties[parentKey];
                        if (propertySchema) {
                            _this.addSchemaValueCompletions(propertySchema, collector, types, separatorAfter);
                        }
                    }
                }
            });
        }
        if (node) {
            if (types['boolean']) {
                this.addBooleanValueCompletion(true, collector, separatorAfter);
                this.addBooleanValueCompletion(false, collector, separatorAfter);
            }
            if (types['null']) {
                this.addNullValueCompletion(collector, separatorAfter);
            }
        }
    };
    YAMLCompletion.prototype.getContributedValueCompletions = function (doc, node, offset, document, collector, collectionPromises) {
        if (!node) {
            this.contributions.forEach(function (contribution) {
                var collectPromise = contribution.collectDefaultCompletions(document.uri, collector);
                if (collectPromise) {
                    collectionPromises.push(collectPromise);
                }
            });
        }
        else {
            if (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null') {
                node = node.parent;
            }
            if ((node.type === 'property') && offset > node.colonOffset) {
                var parentKey_1 = node.key.value;
                var valueNode = node.value;
                if (!valueNode || offset <= valueNode.end) {
                    var location_2 = node.parent.getPath();
                    this.contributions.forEach(function (contribution) {
                        var collectPromise = contribution.collectValueCompletions(document.uri, location_2, parentKey_1, collector);
                        if (collectPromise) {
                            collectionPromises.push(collectPromise);
                        }
                    });
                }
            }
        }
    };
    YAMLCompletion.prototype.getCustomTagValueCompletions = function (collector) {
        var _this = this;
        this.customTags.forEach(function (customTagItem) {
            var tagItemSplit = customTagItem.split(" ");
            if (tagItemSplit && tagItemSplit[0]) {
                _this.addCustomTagValueCompletion(collector, " ", tagItemSplit[0]);
            }
        });
    };
    YAMLCompletion.prototype.addSchemaValueCompletions = function (schema, collector, types, separatorAfter) {
        var _this = this;
        this.addDefaultValueCompletions(schema, collector, separatorAfter);
        this.addEnumValueCompletions(schema, collector, separatorAfter);
        this.collectTypes(schema, types);
        if (Array.isArray(schema.allOf)) {
            schema.allOf.forEach(function (s) { return _this.addSchemaValueCompletions(s, collector, types, separatorAfter); });
        }
        if (Array.isArray(schema.anyOf)) {
            schema.anyOf.forEach(function (s) { return _this.addSchemaValueCompletions(s, collector, types, separatorAfter); });
        }
        if (Array.isArray(schema.oneOf)) {
            schema.oneOf.forEach(function (s) { return _this.addSchemaValueCompletions(s, collector, types, separatorAfter); });
        }
    };
    YAMLCompletion.prototype.addDefaultValueCompletions = function (schema, collector, separatorAfter, arrayDepth) {
        if (arrayDepth === void 0) { arrayDepth = 0; }
        var hasProposals = false;
        if (schema.default) {
            var type = schema.type;
            var value = schema.default;
            for (var i = arrayDepth; i > 0; i--) {
                value = [value];
                type = 'array';
            }
            collector.add({
                kind: this.getSuggestionKind(type),
                label: this.getLabelForValue(value),
                insertText: this.getInsertTextForValue(value, separatorAfter),
                insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
                detail: localize('json.suggest.default', 'Default value'),
            });
            hasProposals = true;
        }
        if (!hasProposals && schema.items && !Array.isArray(schema.items)) {
            this.addDefaultValueCompletions(schema.items, collector, separatorAfter, arrayDepth + 1);
        }
    };
    YAMLCompletion.prototype.addEnumValueCompletions = function (schema, collector, separatorAfter) {
        console.log('addEnumValueCompletions');
        if (Array.isArray(schema.enum)) {
            for (var i = 0, length_1 = schema.enum.length; i < length_1; i++) {
                var enm = schema.enum[i];
                var documentation = schema.description;
                if (schema.enumDescriptions && i < schema.enumDescriptions.length) {
                    documentation = schema.enumDescriptions[i];
                }
                collector.add({
                    kind: this.getSuggestionKind(schema.type),
                    label: this.getLabelForValue(enm),
                    insertText: this.getInsertTextForValue(enm, separatorAfter),
                    insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
                    documentation: documentation
                });
            }
        }
    };
    YAMLCompletion.prototype.collectTypes = function (schema, types) {
        var type = schema.type;
        if (Array.isArray(type)) {
            type.forEach(function (t) { return types[t] = true; });
        }
        else {
            types[type] = true;
        }
    };
    YAMLCompletion.prototype.addBooleanValueCompletion = function (value, collector, separatorAfter) {
        collector.add({
            kind: this.getSuggestionKind('boolean'),
            label: value ? 'true' : 'false',
            insertText: this.getInsertTextForValue(value, separatorAfter),
            insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
            documentation: ''
        });
    };
    YAMLCompletion.prototype.addNullValueCompletion = function (collector, separatorAfter) {
        collector.add({
            kind: this.getSuggestionKind('null'),
            label: 'null',
            insertText: 'null' + separatorAfter,
            insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
            documentation: ''
        });
    };
    YAMLCompletion.prototype.addCustomTagValueCompletion = function (collector, separatorAfter, label) {
        collector.add({
            kind: this.getSuggestionKind('string'),
            label: label,
            insertText: label + separatorAfter,
            insertTextFormat: vscode_languageserver_types_1.InsertTextFormat.Snippet,
            documentation: ''
        });
    };
    YAMLCompletion.prototype.getLabelForValue = function (value) {
        var label = typeof value === "string" ? value : JSON.stringify(value);
        if (label.length > 57) {
            return label.substr(0, 57).trim() + '...';
        }
        return label;
    };
    YAMLCompletion.prototype.getSuggestionKind = function (type) {
        if (Array.isArray(type)) {
            var array = type;
            type = array.length > 0 ? array[0] : null;
        }
        if (!type) {
            return vscode_languageserver_types_1.CompletionItemKind.Value;
        }
        switch (type) {
            case 'string': return vscode_languageserver_types_1.CompletionItemKind.Value;
            case 'object': return vscode_languageserver_types_1.CompletionItemKind.Module;
            case 'property': return vscode_languageserver_types_1.CompletionItemKind.Property;
            default: return vscode_languageserver_types_1.CompletionItemKind.Value;
        }
    };
    YAMLCompletion.prototype.getCurrentWord = function (document, offset) {
        var i = offset - 1;
        var text = document.getText();
        while (i >= 0 && ' \t\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
            i--;
        }
        return text.substring(i + 1, offset);
    };
    YAMLCompletion.prototype.findItemAtOffset = function (node, document, offset) {
        var scanner = Json.createScanner(document.getText(), true);
        var children = node.getChildNodes();
        for (var i = children.length - 1; i >= 0; i--) {
            var child = children[i];
            if (offset > child.end) {
                scanner.setPosition(child.end);
                var token = scanner.scan();
                if (token === 5 /* CommaToken */ && offset >= scanner.getTokenOffset() + scanner.getTokenLength()) {
                    return i + 1;
                }
                return i;
            }
            else if (offset >= child.start) {
                return i;
            }
        }
        return 0;
    };
    YAMLCompletion.prototype.isInComment = function (document, start, offset) {
        var scanner = Json.createScanner(document.getText(), false);
        scanner.setPosition(start);
        var token = scanner.scan();
        while (token !== 17 /* EOF */ && (scanner.getTokenOffset() + scanner.getTokenLength() < offset)) {
            token = scanner.scan();
        }
        return (token === 12 /* LineCommentTrivia */ || token === 13 /* BlockCommentTrivia */) && scanner.getTokenOffset() <= offset;
    };
    YAMLCompletion.prototype.getInsertTextForPlainText = function (text) {
        return text.replace(/[\\\$\}]/g, '\\$&'); // escape $, \ and } 
    };
    YAMLCompletion.prototype.getInsertTextForValue = function (value, separatorAfter) {
        var text = value;
        if (text === '{}') {
            return '{\n\t$1\n}' + separatorAfter;
        }
        else if (text === '[]') {
            return '[\n\t$1\n]' + separatorAfter;
        }
        return this.getInsertTextForPlainText(text + separatorAfter);
    };
    YAMLCompletion.prototype.getInsertTextForProperty = function (key, propertySchema, addValue, separatorAfter) {
        var propertyText = this.getInsertTextForValue(key, '');
        var resultText = propertyText + ':';
        var value = null;
        if (propertySchema) {
            var type = Array.isArray(propertySchema.type) ? propertySchema.type[0] : propertySchema.type;
            if (!type) {
                if (propertySchema.properties) {
                    type = 'object';
                }
                else if (propertySchema.items) {
                    type = 'array';
                }
                else if (propertySchema.hasOwnProperty("oneOf")) {
                    type = "oneOf";
                }
                else if (propertySchema.hasOwnProperty("anyOf")) {
                    type = "anyOf";
                }
                else if (propertySchema.hasOwnProperty("allOf")) {
                    type = "allOf";
                }
            }
            switch (type) {
                case 'boolean':
                    value = ' $1';
                    break;
                case 'string':
                    value = ' $1';
                    break;
                case 'object':
                    value = '\n\t';
                    break;
                case 'array':
                    value = '\n\t- ';
                    break;
                case 'number':
                case 'integer':
                    value = ' ${1:0}';
                    break;
                case 'null':
                    value = ' ${1:null}';
                    break;
                case "oneOf":
                case "anyOf":
                case "allOf":
                    value = "";
                    break;
                default:
                    return propertyText;
            }
        }
        if (value === null) {
            value = '$1';
        }
        return resultText + value + separatorAfter;
    };
    YAMLCompletion.prototype.evaluateSeparatorAfter = function (document, offset) {
        var scanner = Json.createScanner(document.getText(), true);
        scanner.setPosition(offset);
        var token = scanner.scan();
        switch (token) {
            case 5 /* CommaToken */:
            case 2 /* CloseBraceToken */:
            case 4 /* CloseBracketToken */:
            case 17 /* EOF */:
                return '';
            default:
                return '';
        }
    };
    return YAMLCompletion;
}());
exports.YAMLCompletion = YAMLCompletion;
//# sourceMappingURL=yamlCompletion.js.map