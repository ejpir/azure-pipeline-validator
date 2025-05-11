/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
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
exports.JSONDocument = exports.ValidationResult = exports.EnumMatch = exports.ObjectASTNode = exports.PropertyASTNode = exports.StringASTNode = exports.NumberASTNode = exports.ArrayASTNode = exports.BooleanASTNode = exports.NullASTNode = exports.ASTNode = exports.ProblemSeverity = exports.ErrorCode = void 0;
var objects = require("../utils/objects");
var yamlServiceUtils_1 = require("../utils/yamlServiceUtils");
var nls = require("vscode-nls");
var localize = nls.loadMessageBundle();
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["Undefined"] = 0] = "Undefined";
    ErrorCode[ErrorCode["EnumValueMismatch"] = 1] = "EnumValueMismatch";
    ErrorCode[ErrorCode["CommentsNotAllowed"] = 2] = "CommentsNotAllowed";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
var ProblemSeverity;
(function (ProblemSeverity) {
    ProblemSeverity[ProblemSeverity["Error"] = 0] = "Error";
    ProblemSeverity[ProblemSeverity["Warning"] = 1] = "Warning";
    ProblemSeverity[ProblemSeverity["Hint"] = 2] = "Hint";
})(ProblemSeverity = exports.ProblemSeverity || (exports.ProblemSeverity = {}));
var ASTNode = /** @class */ (function () {
    function ASTNode(parent, type, location, start, end) {
        this.type = type;
        this.location = location;
        this.start = start;
        this.end = end;
        this.parent = parent;
        this.parserSettings = {
            isKubernetes: false
        };
    }
    ASTNode.prototype.setParserSettings = function (parserSettings) {
        this.parserSettings = parserSettings;
    };
    ASTNode.prototype.getPath = function () {
        var path = this.parent ? this.parent.getPath() : [];
        if (this.location !== null) {
            path.push(this.location);
        }
        return path;
    };
    ASTNode.prototype.getChildNodes = function () {
        return [];
    };
    ASTNode.prototype.getLastChild = function () {
        return null;
    };
    ASTNode.prototype.getValue = function () {
        // override in children
        return;
    };
    ASTNode.prototype.contains = function (offset, includeRightBound) {
        if (includeRightBound === void 0) { includeRightBound = false; }
        return offset >= this.start && offset < this.end || includeRightBound && offset === this.end;
    };
    ASTNode.prototype.toString = function () {
        return 'type: ' + this.type + ' (' + this.start + '/' + this.end + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
    };
    ASTNode.prototype.visit = function (visitor) {
        return visitor(this);
    };
    ASTNode.prototype.getNodeFromOffset = function (offset) {
        var findNode = function (node) {
            if (offset >= node.start && offset < node.end) {
                var children = node.getChildNodes();
                for (var i = 0; i < children.length && children[i].start <= offset; i++) {
                    var item = findNode(children[i]);
                    if (item) {
                        return item;
                    }
                }
                return node;
            }
            return null;
        };
        return findNode(this);
    };
    ASTNode.prototype.getNodeCollectorCount = function () {
        var collector = [];
        var findNode = function (node) {
            var children = node.getChildNodes();
            for (var i = 0; i < children.length; i++) {
                var item = findNode(children[i]);
                if (item && item.type === "property") {
                    collector.push(item);
                }
            }
            return node;
        };
        return collector.length;
    };
    ASTNode.prototype.getNodeFromOffsetEndInclusive = function (offset) {
        var collector = [];
        var findNode = function (node) {
            if (offset >= node.start && offset <= node.end) {
                var children = node.getChildNodes();
                for (var i = 0; i < children.length && children[i].start <= offset; i++) {
                    var item = findNode(children[i]);
                    if (item) {
                        collector.push(item);
                    }
                }
                return node;
            }
            return null;
        };
        var foundNode = findNode(this);
        var currMinDist = Number.MAX_VALUE;
        var currMinNode = null;
        for (var possibleNode in collector) {
            var currNode = collector[possibleNode];
            var minDist = (currNode.end - offset) + (offset - currNode.start);
            if (minDist < currMinDist) {
                currMinNode = currNode;
                currMinDist = minDist;
            }
        }
        return currMinNode || foundNode;
    };
    ASTNode.getIgnoreValueCase = function (schema) {
        return schema && (schema.ignoreCase === "value" || schema.ignoreCase === "all");
    };
    ASTNode.getIgnoreKeyCase = function (schema) {
        return schema && (schema.ignoreCase === "key" || schema.ignoreCase === "all");
    };
    ASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        var _this = this;
        if (!matchingSchemas.include(this)) {
            return;
        }
        if (Array.isArray(schema.type)) {
            if (schema.type.indexOf(this.type) === -1) {
                //allow numbers to be validated as strings
                var isValid = false;
                if (this.type === 'number') {
                    isValid = schema.type.indexOf('string') >= 0;
                }
                if (!isValid) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return schema.errorMessage || localize('typeArrayMismatchWarning', 'Incorrect type. Expected one of {0}.', schema.type.join(', ')); }
                    });
                }
            }
        }
        else if (schema.type) {
            if (this.type !== schema.type) {
                //count strings that look like numbers as strings
                if (this.type != "number" || schema.type != "string") {
                    var isVariableExpression = false;
                    if (this.type === 'string') {
                        // Ignore expressions as those will be replaced by Azure Pipelines
                        var currentValue = String(this.getValue());
                        isVariableExpression = (currentValue.startsWith('${{') && currentValue.endsWith("}}"))
                            || (currentValue.startsWith('$[') && currentValue.endsWith("]"))
                            || (currentValue.startsWith('$(') && currentValue.endsWith(")"));
                    }
                    if (!isVariableExpression) {
                        validationResult.addProblem({
                            location: { start: this.start, end: this.end },
                            severity: ProblemSeverity.Warning,
                            getMessage: function () { return schema.errorMessage || localize('typeMismatchWarning', 'Incorrect type. Expected "{0}".', schema.type); }
                        });
                    }
                }
            }
        }
        if (Array.isArray(schema.allOf)) {
            schema.allOf.forEach(function (subSchema) {
                _this.validate(subSchema, validationResult, matchingSchemas);
            });
        }
        if (schema.not) {
            var subValidationResult = new ValidationResult();
            var subMatchingSchemas = matchingSchemas.newSub();
            this.validate(schema.not, subValidationResult, subMatchingSchemas);
            if (!subValidationResult.hasProblems()) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return localize('notSchemaWarning', "Matches a schema that is not allowed."); }
                });
            }
            subMatchingSchemas.schemas.forEach(function (ms) {
                ms.inverted = !ms.inverted;
                matchingSchemas.add(ms);
            });
        }
        var testAlternatives = function (alternatives, maxOneMatch) {
            var matches = [];
            var firstPropMatches = _this.getFirstPropertyMatches(alternatives);
            var possibleMatches = (Array.isArray(firstPropMatches) && firstPropMatches.length > 0) ? firstPropMatches : alternatives;
            // remember the best match that is used for error messages
            var bestMatch = null;
            possibleMatches.forEach(function (subSchema) {
                var subValidationResult = new ValidationResult();
                var subMatchingSchemas = matchingSchemas.newSub();
                _this.validate(subSchema, subValidationResult, subMatchingSchemas);
                if (!subValidationResult.hasProblems()) {
                    matches.push(subSchema);
                }
                if (!bestMatch) {
                    bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
                }
                else if (_this.parserSettings.isKubernetes) {
                    bestMatch = alternativeComparison(subValidationResult, bestMatch, subSchema, subMatchingSchemas);
                }
                else {
                    bestMatch = genericComparison(maxOneMatch, subValidationResult, bestMatch, subSchema, subMatchingSchemas);
                }
            });
            if (matches.length > 1 && maxOneMatch && !_this.parserSettings.isKubernetes) {
                validationResult.addProblem({
                    location: { start: _this.start, end: _this.start + 1 },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return localize('oneOfWarning', "Matches multiple schemas when only one must validate."); }
                });
            }
            if (bestMatch !== null) {
                validationResult.mergeSubResult(bestMatch.validationResult);
                validationResult.propertiesMatches += bestMatch.validationResult.propertiesMatches;
                validationResult.propertiesValueMatches += bestMatch.validationResult.propertiesValueMatches;
                matchingSchemas.merge(bestMatch.matchingSchemas);
            }
            return matches.length;
        };
        if (Array.isArray(schema.anyOf)) {
            testAlternatives(schema.anyOf, false);
        }
        if (Array.isArray(schema.oneOf)) {
            testAlternatives(schema.oneOf, true);
        }
        if (Array.isArray(schema.enum)) {
            var val = this.getValue();
            //force number values to strings for the comparison
            if (typeof val === "number") {
                val = val.toString();
            }
            var enumValueMatch = false;
            if (val) {
                var ignoreCase = ASTNode.getIgnoreValueCase(schema);
                for (var _i = 0, _a = schema.enum; _i < _a.length; _i++) {
                    var e = _a[_i];
                    if (objects.equals(val, e) ||
                        (ignoreCase && typeof e === "string" && typeof val === "string" && e.toUpperCase() === val.toUpperCase())) {
                        enumValueMatch = true;
                        break;
                    }
                }
            }
            validationResult.enumValues = schema.enum;
            validationResult.enumValueMatch = enumValueMatch;
            if (!enumValueMatch) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    code: ErrorCode.EnumValueMismatch,
                    getMessage: function () { return schema.errorMessage || localize('enumWarning', 'Value is not accepted. Valid values: {0}.', schema.enum.map(function (v) { return JSON.stringify(v); }).join(', ')); }
                });
            }
        }
        if (schema.deprecationMessage && this.parent) {
            validationResult.addProblem({
                location: { start: this.parent.start, end: this.parent.end },
                severity: ProblemSeverity.Hint,
                getMessage: function () { return schema.deprecationMessage; }
            });
        }
        matchingSchemas.add({ node: this, schema: schema });
    };
    ASTNode.prototype.validateStringValue = function (schema, value, validationResult) {
        if (schema.minLength && value.length < schema.minLength) {
            validationResult.addProblem({
                location: { start: this.start, end: this.end },
                severity: ProblemSeverity.Warning,
                getMessage: function () { return localize('minLengthWarning', 'String is shorter than the minimum length of {0}.', schema.minLength); }
            });
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            validationResult.addProblem({
                location: { start: this.start, end: this.end },
                severity: ProblemSeverity.Warning,
                getMessage: function () { return localize('maxLengthWarning', 'String is longer than the maximum length of {0}.', schema.maxLength); }
            });
        }
        if (schema.pattern) {
            var flags = ASTNode.getIgnoreValueCase(schema) ? "i" : "";
            var regex = new RegExp(schema.pattern, flags);
            if (!regex.test(value)) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return schema.patternErrorMessage || schema.errorMessage || localize('patternWarning', 'String does not match the pattern of "{0}".', schema.pattern); }
                });
            }
        }
    };
    ASTNode.prototype.getFirstPropertyMatches = function (subSchemas) {
        return [];
    };
    return ASTNode;
}());
exports.ASTNode = ASTNode;
var NullASTNode = /** @class */ (function (_super) {
    __extends(NullASTNode, _super);
    function NullASTNode(parent, name, start, end) {
        return _super.call(this, parent, 'null', name, start, end) || this;
    }
    NullASTNode.prototype.getValue = function () {
        return null;
    };
    NullASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        if (!matchingSchemas.include(this)) {
            return;
        }
        //allow empty values to validate as strings
        if (schema.type === 'string') {
            this.validateStringValue(schema, '', validationResult);
        }
        else {
            _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
        }
    };
    return NullASTNode;
}(ASTNode));
exports.NullASTNode = NullASTNode;
var BooleanASTNode = /** @class */ (function (_super) {
    __extends(BooleanASTNode, _super);
    function BooleanASTNode(parent, name, value, start, end) {
        var _this = _super.call(this, parent, 'boolean', name, start, end) || this;
        _this.value = value;
        return _this;
    }
    BooleanASTNode.prototype.getValue = function () {
        return this.value;
    };
    BooleanASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        if (!matchingSchemas.include(this)) {
            return;
        }
        //allow empty values to validate as strings
        if (schema.type === 'string') {
            //The pipeline parser allows expressions that evaluate to booleans and right now
            //the generated schema is not precise about that and allows any string.  The
            //values 'true' and 'false' get parsed into BooleanASTNodes but we need to
            //allow them to match against 'string' in the schema.
            this.validateStringValue(schema, '' + this.getValue(), validationResult);
        }
        else {
            _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
        }
    };
    return BooleanASTNode;
}(ASTNode));
exports.BooleanASTNode = BooleanASTNode;
var ArrayASTNode = /** @class */ (function (_super) {
    __extends(ArrayASTNode, _super);
    function ArrayASTNode(parent, name, start, end) {
        var _this = _super.call(this, parent, 'array', name, start, end) || this;
        _this.items = [];
        return _this;
    }
    ArrayASTNode.prototype.getChildNodes = function () {
        return this.items;
    };
    ArrayASTNode.prototype.getLastChild = function () {
        return this.items[this.items.length - 1];
    };
    ArrayASTNode.prototype.getValue = function () {
        return this.items.map(function (v) { return v.getValue(); });
    };
    ArrayASTNode.prototype.addItem = function (item) {
        if (item) {
            this.items.push(item);
            return true;
        }
        return false;
    };
    ArrayASTNode.prototype.visit = function (visitor) {
        var ctn = visitor(this);
        for (var i = 0; i < this.items.length && ctn; i++) {
            ctn = this.items[i].visit(visitor);
        }
        return ctn;
    };
    ArrayASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        var _this = this;
        if (!matchingSchemas.include(this)) {
            return;
        }
        _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
        if (Array.isArray(schema.items)) {
            var subSchemas_1 = schema.items;
            subSchemas_1.forEach(function (subSchema, index) {
                var itemValidationResult = new ValidationResult();
                var item = _this.items[index];
                if (item) {
                    item.validate(subSchema, itemValidationResult, matchingSchemas);
                    validationResult.mergePropertyMatch(itemValidationResult);
                }
                else if (_this.items.length >= subSchemas_1.length) {
                    validationResult.propertiesValueMatches++;
                }
            });
            if (this.items.length > subSchemas_1.length) {
                if (typeof schema.additionalItems === 'object') {
                    for (var i = subSchemas_1.length; i < this.items.length; i++) {
                        var itemValidationResult = new ValidationResult();
                        this.items[i].validate(schema.additionalItems, itemValidationResult, matchingSchemas);
                        validationResult.mergePropertyMatch(itemValidationResult);
                    }
                }
                else if (schema.additionalItems === false) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('additionalItemsWarning', 'Array has too many items according to schema. Expected {0} or fewer.', subSchemas_1.length); }
                    });
                }
            }
        }
        else if (schema.items) {
            for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
                var item = _a[_i];
                var itemValidationResult = new ValidationResult();
                item.validate(schema.items, itemValidationResult, matchingSchemas);
                validationResult.mergePropertyMatch(itemValidationResult);
            }
        }
        if (schema.minItems && this.items.length < schema.minItems) {
            validationResult.addProblem({
                location: { start: this.start, end: this.end },
                severity: ProblemSeverity.Warning,
                getMessage: function () { return localize('minItemsWarning', 'Array has too few items. Expected {0} or more.', schema.minItems); }
            });
        }
        if (schema.maxItems && this.items.length > schema.maxItems) {
            validationResult.addProblem({
                location: { start: this.start, end: this.end },
                severity: ProblemSeverity.Warning,
                getMessage: function () { return localize('maxItemsWarning', 'Array has too many items. Expected {0} or fewer.', schema.maxItems); }
            });
        }
        if (schema.uniqueItems === true) {
            var values_1 = this.items.map(function (node) {
                return node.getValue();
            });
            var duplicates = values_1.some(function (value, index) {
                return index !== values_1.lastIndexOf(value);
            });
            if (duplicates) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return localize('uniqueItemsWarning', 'Array has duplicate items.'); }
                });
            }
        }
    };
    return ArrayASTNode;
}(ASTNode));
exports.ArrayASTNode = ArrayASTNode;
var NumberASTNode = /** @class */ (function (_super) {
    __extends(NumberASTNode, _super);
    function NumberASTNode(parent, name, start, end) {
        var _this = _super.call(this, parent, 'number', name, start, end) || this;
        _this.isInteger = true;
        _this.value = Number.NaN;
        return _this;
    }
    NumberASTNode.prototype.getValue = function () {
        return this.value;
    };
    NumberASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        if (!matchingSchemas.include(this)) {
            return;
        }
        if (schema.type === 'string') {
            //In YAML, a value like 123 could be a number but it could also be a string.  It initially gets
            //parsed into a NumberASTNode, but we should also check it against string schema.
            this.validateStringValue(schema, '' + this.getValue(), validationResult);
        }
        else {
            // work around type validation in the base class
            var typeIsInteger = false;
            if (schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.indexOf('integer') !== -1)) {
                typeIsInteger = true;
            }
            if (typeIsInteger && this.isInteger === true) {
                this.type = 'integer';
            }
            _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
            this.type = 'number';
            var val = this.getValue();
            if (typeof schema.multipleOf === 'number') {
                if (val % schema.multipleOf !== 0) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('multipleOfWarning', 'Value is not divisible by {0}.', schema.multipleOf); }
                    });
                }
            }
            if (typeof schema.minimum === 'number') {
                if (schema.exclusiveMinimum && val <= schema.minimum) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('exclusiveMinimumWarning', 'Value is below the exclusive minimum of {0}.', schema.minimum); }
                    });
                }
                if (!schema.exclusiveMinimum && val < schema.minimum) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('minimumWarning', 'Value is below the minimum of {0}.', schema.minimum); }
                    });
                }
            }
            if (typeof schema.maximum === 'number') {
                if (schema.exclusiveMaximum && val >= schema.maximum) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('exclusiveMaximumWarning', 'Value is above the exclusive maximum of {0}.', schema.maximum); }
                    });
                }
                if (!schema.exclusiveMaximum && val > schema.maximum) {
                    validationResult.addProblem({
                        location: { start: this.start, end: this.end },
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('maximumWarning', 'Value is above the maximum of {0}.', schema.maximum); }
                    });
                }
            }
        }
    };
    return NumberASTNode;
}(ASTNode));
exports.NumberASTNode = NumberASTNode;
var StringASTNode = /** @class */ (function (_super) {
    __extends(StringASTNode, _super);
    function StringASTNode(parent, name, isKey, start, end) {
        var _this = _super.call(this, parent, 'string', name, start, end) || this;
        _this.isKey = isKey;
        _this.value = '';
        return _this;
    }
    StringASTNode.prototype.getValue = function () {
        return this.value;
    };
    StringASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        if (!matchingSchemas.include(this)) {
            return;
        }
        _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
        this.validateStringValue(schema, this.value, validationResult);
    };
    return StringASTNode;
}(ASTNode));
exports.StringASTNode = StringASTNode;
var PropertyASTNode = /** @class */ (function (_super) {
    __extends(PropertyASTNode, _super);
    function PropertyASTNode(parent, key) {
        var _this = _super.call(this, parent, 'property', null, key.start) || this;
        _this.key = key;
        key.parent = _this;
        key.location = key.value;
        _this.colonOffset = -1;
        return _this;
    }
    PropertyASTNode.prototype.getChildNodes = function () {
        return this.value ? [this.key, this.value] : [this.key];
    };
    PropertyASTNode.prototype.getLastChild = function () {
        return this.value;
    };
    PropertyASTNode.prototype.setValue = function (value) {
        this.value = value;
        return value !== null;
    };
    PropertyASTNode.prototype.visit = function (visitor) {
        return visitor(this) && this.key.visit(visitor) && this.value && this.value.visit(visitor);
    };
    PropertyASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        if (!matchingSchemas.include(this)) {
            return;
        }
        if (this.value) {
            this.value.validate(schema, validationResult, matchingSchemas);
        }
    };
    return PropertyASTNode;
}(ASTNode));
exports.PropertyASTNode = PropertyASTNode;
var ObjectASTNode = /** @class */ (function (_super) {
    __extends(ObjectASTNode, _super);
    function ObjectASTNode(parent, name, start, end) {
        var _this = _super.call(this, parent, 'object', name, start, end) || this;
        _this.properties = [];
        return _this;
    }
    ObjectASTNode.prototype.getChildNodes = function () {
        return this.properties;
    };
    ObjectASTNode.prototype.getLastChild = function () {
        return this.properties[this.properties.length - 1];
    };
    ObjectASTNode.prototype.addProperty = function (node) {
        if (!node) {
            return false;
        }
        this.properties.push(node);
        return true;
    };
    // TODO: This assumes there are no duplicate properties,
    // but it would be nice if we could provide hover documentation
    // for all properties, even if they're duplicated later on.
    ObjectASTNode.prototype.getValue = function () {
        var value = Object.create(null);
        this.properties.forEach(function (p) {
            var v = p.value && p.value.getValue();
            if (typeof v !== 'undefined') {
                value[p.key.getValue()] = v;
            }
        });
        return value;
    };
    ObjectASTNode.prototype.visit = function (visitor) {
        var ctn = visitor(this);
        for (var i = 0; i < this.properties.length && ctn; i++) {
            ctn = this.properties[i].visit(visitor);
        }
        return ctn;
    };
    ObjectASTNode.prototype.validate = function (schema, validationResult, matchingSchemas) {
        var _this = this;
        var _a, _b;
        if (!matchingSchemas.include(this)) {
            return;
        }
        _super.prototype.validate.call(this, schema, validationResult, matchingSchemas);
        var seenKeys = Object.create(null);
        var unprocessedProperties = [];
        this.properties.forEach(function (node) {
            var key = node.key.value;
            // Replace the merge key with the actual values of what the node value points to in seen keys
            if (key === "<<" && node.value) {
                switch (node.value.type) {
                    case "object": {
                        node.value["properties"].forEach(function (propASTNode) {
                            var propKey = propASTNode.key.value;
                            seenKeys[propKey] = propASTNode.value;
                            unprocessedProperties.push(propKey);
                        });
                        break;
                    }
                    case "array": {
                        node.value["items"].forEach(function (sequenceNode) {
                            sequenceNode["properties"].forEach(function (propASTNode) {
                                var seqKey = propASTNode.key.value;
                                seenKeys[seqKey] = propASTNode.value;
                                unprocessedProperties.push(seqKey);
                            });
                        });
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
            else {
                seenKeys[key] = node.value;
                unprocessedProperties.push(key);
            }
        });
        var findMatchingProperties = function (propertyKey) {
            var result = Object.create(null);
            var compareKey = propertyKey.toUpperCase();
            Object.keys(seenKeys).forEach(function (propertyName) {
                if (propertyName.toUpperCase() === compareKey) {
                    result[propertyName] = seenKeys[propertyName];
                }
            });
            return result;
        };
        var hasProperty = function (propertyKey) {
            if (seenKeys[propertyKey]) {
                return true;
            }
            if (schema.properties) {
                var propSchema = schema.properties[propertyKey];
                if (propSchema) {
                    var ignoreKeyCase_1 = ASTNode.getIgnoreKeyCase(propSchema);
                    if (ignoreKeyCase_1) {
                        var matchedKeys = findMatchingProperties(propertyKey);
                        if (Object.keys(matchedKeys).length > 0) {
                            return true;
                        }
                    }
                    if (Array.isArray(propSchema.aliases)) {
                        return propSchema.aliases.some(function (aliasName) {
                            if (seenKeys[aliasName]) {
                                return true;
                            }
                            if (ignoreKeyCase_1) {
                                var matchedKeys = findMatchingProperties(aliasName);
                                return Object.keys(matchedKeys).length > 0;
                            }
                            return false;
                        });
                    }
                }
            }
            return false;
        };
        if (Array.isArray(schema.required)) {
            schema.required.forEach(function (propertyName) {
                if (!hasProperty(propertyName)) {
                    var key = _this.parent && _this.parent.key;
                    var location_1 = key ? { start: key.start, end: key.end } : { start: _this.start, end: _this.start + 1 };
                    validationResult.addProblem({
                        location: location_1,
                        severity: ProblemSeverity.Warning,
                        getMessage: function () { return localize('MissingRequiredPropWarning', 'Missing property "{0}".', propertyName); }
                    });
                }
            });
        }
        var propertyProcessed = function (prop) {
            var index = unprocessedProperties.indexOf(prop);
            while (index >= 0) {
                unprocessedProperties.splice(index, 1);
                index = unprocessedProperties.indexOf(prop);
            }
        };
        if (schema.properties) {
            Object.keys(schema.properties).forEach(function (schemaPropertyName) {
                var propSchema = schema.properties[schemaPropertyName];
                var children = {};
                var ignoreKeyCase = ASTNode.getIgnoreKeyCase(propSchema);
                if (ignoreKeyCase) {
                    children = findMatchingProperties(schemaPropertyName);
                }
                else if (seenKeys[schemaPropertyName]) {
                    children[schemaPropertyName] = seenKeys[schemaPropertyName];
                }
                if (Array.isArray(propSchema.aliases)) {
                    propSchema.aliases.forEach(function (aliasName) {
                        if (ignoreKeyCase) {
                            Object.assign(children, findMatchingProperties(aliasName));
                        }
                        else if (seenKeys[aliasName]) {
                            children[aliasName] = seenKeys[aliasName];
                        }
                    });
                }
                var child = null;
                var numChildren = Object.keys(children).length;
                var generateErrors = numChildren > 1;
                Object.keys(children).forEach(function (childKey) {
                    propertyProcessed(childKey);
                    if (generateErrors) {
                        var childProperty = (children[childKey].parent);
                        validationResult.addProblem({
                            location: { start: childProperty.key.start, end: childProperty.key.end },
                            severity: ProblemSeverity.Error,
                            getMessage: function () { return localize('DuplicatePropError', 'Multiple properties found matching {0}', schemaPropertyName); }
                        });
                    }
                    else {
                        child = children[childKey];
                    }
                });
                if (child) {
                    var propertyValidationResult = new ValidationResult();
                    child.validate(propSchema, propertyValidationResult, matchingSchemas);
                    validationResult.mergePropertyMatch(propertyValidationResult);
                }
            });
        }
        if (schema.patternProperties) {
            Object.keys(schema.patternProperties).forEach(function (propertyPattern) {
                var ignoreKeyCase = ASTNode.getIgnoreKeyCase(schema.patternProperties[propertyPattern]);
                var regex = new RegExp(propertyPattern, ignoreKeyCase ? "i" : "");
                unprocessedProperties.slice(0).forEach(function (propertyName) {
                    if (regex.test(propertyName)) {
                        propertyProcessed(propertyName);
                        var child = seenKeys[propertyName];
                        if (child) {
                            var propertyValidationResult = new ValidationResult();
                            var childSchema = schema.patternProperties[propertyPattern];
                            child.validate(childSchema, propertyValidationResult, matchingSchemas);
                            validationResult.mergePropertyMatch(propertyValidationResult);
                        }
                    }
                });
            });
        }
        if (typeof schema.additionalProperties === 'object') {
            unprocessedProperties.forEach(function (propertyName) {
                var child = seenKeys[propertyName];
                if (child) {
                    var propertyValidationResult = new ValidationResult();
                    child.validate(schema.additionalProperties, propertyValidationResult, matchingSchemas);
                    validationResult.mergePropertyMatch(propertyValidationResult);
                }
            });
        }
        else if (schema.additionalProperties === false) {
            if (unprocessedProperties.length > 0) {
                unprocessedProperties.forEach(function (propertyName) {
                    //Auto-complete can insert a "holder" node when parsing, do not count it as an error
                    //against additionalProperties
                    if (propertyName !== yamlServiceUtils_1.nodeHolder) {
                        var child_1 = seenKeys[propertyName];
                        if (child_1) {
                            var errorLocation = null;
                            var errorNode_1 = child_1;
                            if (errorNode_1.type !== "property" && errorNode_1.parent) {
                                if (errorNode_1.parent.type === "property") {
                                    //This works for StringASTNode
                                    errorNode_1 = errorNode_1.parent;
                                }
                                else if (errorNode_1.parent.type === "object") {
                                    //The tree structure and parent links can be weird
                                    //NullASTNode's parent will be the object and not the property
                                    var parentObject = errorNode_1.parent;
                                    parentObject.properties.some(function (propNode) {
                                        if (propNode.value == child_1) {
                                            errorNode_1 = propNode;
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                            }
                            if (errorNode_1.type === "property") {
                                var propertyNode = errorNode_1;
                                errorLocation = {
                                    start: propertyNode.key.start,
                                    end: propertyNode.key.end
                                };
                            }
                            else {
                                errorLocation = {
                                    start: errorNode_1.start,
                                    end: errorNode_1.end
                                };
                            }
                            validationResult.addProblem({
                                location: errorLocation,
                                severity: ProblemSeverity.Warning,
                                getMessage: function () { return schema.errorMessage || localize('DisallowedExtraPropWarning', 'Unexpected property {0}', propertyName); }
                            });
                        }
                    }
                });
            }
        }
        if (schema.maxProperties) {
            if (this.properties.length > schema.maxProperties) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return localize('MaxPropWarning', 'Object has more properties than limit of {0}.', schema.maxProperties); }
                });
            }
        }
        if (schema.minProperties) {
            if (this.properties.length < schema.minProperties) {
                validationResult.addProblem({
                    location: { start: this.start, end: this.end },
                    severity: ProblemSeverity.Warning,
                    getMessage: function () { return localize('MinPropWarning', 'Object has fewer properties than the required number of {0}', schema.minProperties); }
                });
            }
        }
        if (schema.dependencies) {
            Object.keys(schema.dependencies).forEach(function (key) {
                if (hasProperty(key)) {
                    var propertyDep = schema.dependencies[key];
                    if (Array.isArray(propertyDep)) {
                        propertyDep.forEach(function (requiredProp) {
                            if (!hasProperty(requiredProp)) {
                                validationResult.addProblem({
                                    location: { start: _this.start, end: _this.end },
                                    severity: ProblemSeverity.Warning,
                                    getMessage: function () { return localize('RequiredDependentPropWarning', 'Object is missing property {0} required by property {1}.', requiredProp, key); }
                                });
                            }
                            else {
                                validationResult.propertiesValueMatches++;
                            }
                        });
                    }
                    else if (propertyDep) {
                        var propertyValidationResult = new ValidationResult();
                        _this.validate(propertyDep, propertyValidationResult, matchingSchemas);
                        validationResult.mergePropertyMatch(propertyValidationResult);
                    }
                }
            });
        }
        if ((_a = schema.firstProperty) === null || _a === void 0 ? void 0 : _a.length) {
            var firstProperty = this.properties[0];
            if ((_b = firstProperty === null || firstProperty === void 0 ? void 0 : firstProperty.key) === null || _b === void 0 ? void 0 : _b.value) {
                var firstPropKey_1 = firstProperty.key.value;
                if (!schema.firstProperty.some(function (listProperty) {
                    if (listProperty === firstPropKey_1) {
                        return true;
                    }
                    if (schema.properties) {
                        var propertySchema = schema.properties[listProperty];
                        if (propertySchema) {
                            var ignoreCase_1 = ASTNode.getIgnoreKeyCase(propertySchema);
                            if (ignoreCase_1 && listProperty.toUpperCase() === firstPropKey_1.toUpperCase()) {
                                return true;
                            }
                            if (Array.isArray(propertySchema.aliases)) {
                                return propertySchema.aliases.some(function (aliasName) {
                                    if (aliasName === firstPropKey_1) {
                                        return true;
                                    }
                                    return ignoreCase_1 && aliasName.toUpperCase() === firstPropKey_1.toUpperCase();
                                });
                            }
                        }
                    }
                    return false;
                })) {
                    if (schema.firstProperty.length == 1) {
                        validationResult.addProblem({
                            location: { start: firstProperty.start, end: firstProperty.end },
                            severity: ProblemSeverity.Error,
                            getMessage: function () { return localize('firstPropertyError', "The first property must be {0}", schema.firstProperty[0]); }
                        });
                    }
                    else {
                        validationResult.addProblem({
                            location: { start: firstProperty.start, end: firstProperty.end },
                            severity: ProblemSeverity.Error,
                            getMessage: function () {
                                var separator = localize('listSeparator', ", ");
                                return localize('firstPropertyErrorList', "The first property must be one of: {0}", schema.firstProperty.join(separator));
                            }
                        });
                    }
                }
            }
        }
    };
    ObjectASTNode.prototype.getFirstPropertyMatches = function (subSchemas) {
        var _a;
        var firstProperty = this.properties[0];
        if (!((_a = firstProperty === null || firstProperty === void 0 ? void 0 : firstProperty.key) === null || _a === void 0 ? void 0 : _a.value)) {
            return [];
        }
        var firstPropKey = firstProperty.key.value;
        var matches = [];
        subSchemas.forEach(function (schema) {
            if (schema.firstProperty && schema.firstProperty.length) {
                var firstPropSchemaName_1 = null;
                if (schema.firstProperty.indexOf(firstPropKey) >= 0) {
                    firstPropSchemaName_1 = firstPropKey;
                }
                else if (ASTNode.getIgnoreKeyCase(schema)) {
                    var firstPropCompareKey_1 = firstPropKey.toUpperCase();
                    schema.firstProperty.some(function (schemaProp) {
                        if (schemaProp.toUpperCase() === firstPropCompareKey_1) {
                            firstPropSchemaName_1 = schemaProp;
                            return true;
                        }
                        return false;
                    });
                }
                if (firstPropSchemaName_1 != null) {
                    if (!schema.properties) {
                        matches.push(schema);
                    }
                    else {
                        var propertySchema = schema.properties[firstPropSchemaName_1];
                        if (!propertySchema) {
                            matches.push(schema);
                        }
                        else {
                            var propertyValidationResult = new ValidationResult();
                            firstProperty.validate(propertySchema, propertyValidationResult, new SchemaCollector(-1, null));
                            if (!propertyValidationResult.hasProblems()) {
                                matches.push(schema);
                            }
                        }
                    }
                }
            }
        });
        return matches;
    };
    return ObjectASTNode;
}(ASTNode));
exports.ObjectASTNode = ObjectASTNode;
var EnumMatch;
(function (EnumMatch) {
    EnumMatch[EnumMatch["Key"] = 0] = "Key";
    EnumMatch[EnumMatch["Enum"] = 1] = "Enum";
})(EnumMatch = exports.EnumMatch || (exports.EnumMatch = {}));
var SchemaCollector = /** @class */ (function () {
    function SchemaCollector(focusOffset, exclude) {
        if (focusOffset === void 0) { focusOffset = -1; }
        if (exclude === void 0) { exclude = null; }
        this.focusOffset = focusOffset;
        this.exclude = exclude;
        this.schemas = [];
    }
    SchemaCollector.prototype.add = function (schema) {
        this.schemas.push(schema);
    };
    SchemaCollector.prototype.merge = function (other) {
        var _a;
        (_a = this.schemas).push.apply(_a, other.schemas);
    };
    SchemaCollector.prototype.include = function (node) {
        return (this.focusOffset === -1 || node.contains(this.focusOffset)) && (node !== this.exclude);
    };
    SchemaCollector.prototype.newSub = function () {
        return new SchemaCollector(-1, this.exclude);
    };
    return SchemaCollector;
}());
var NoOpSchemaCollector = /** @class */ (function () {
    function NoOpSchemaCollector() {
    }
    Object.defineProperty(NoOpSchemaCollector.prototype, "schemas", {
        get: function () { return []; },
        enumerable: false,
        configurable: true
    });
    NoOpSchemaCollector.prototype.add = function (schema) { };
    NoOpSchemaCollector.prototype.merge = function (other) { };
    NoOpSchemaCollector.prototype.include = function (node) { return true; };
    NoOpSchemaCollector.prototype.newSub = function () { return this; };
    return NoOpSchemaCollector;
}());
var ValidationResult = /** @class */ (function () {
    function ValidationResult() {
        this.problems = [];
        this.problemDepths = [0];
        this.propertiesMatches = 0;
        this.propertiesValueMatches = 0;
        this.primaryValueMatches = 0;
        this.enumValueMatch = false;
        this.enumValues = null;
    }
    ValidationResult.prototype.hasProblems = function () {
        return !!this.problems.length;
    };
    ValidationResult.prototype.addProblem = function (problem) {
        this.problems.push(problem);
        this.problemDepths[0]++;
    };
    ValidationResult.prototype.mergeSubResult = function (validationResult) {
        var _this = this;
        this.problems = this.problems.concat(validationResult.problems);
        //overlay the problem count array one level down
        //first make sure the array is long enough
        var subDepth = validationResult.problemDepths.length;
        while (this.problemDepths.length <= subDepth) {
            this.problemDepths.push(0);
        }
        //then add the problem counts shifted lower in the parse tree
        validationResult.problemDepths.forEach(function (problemCount, depth) {
            _this.problemDepths[depth + 1] += problemCount;
        });
    };
    ValidationResult.prototype.mergeEnumValues = function (validationResult) {
        var _this = this;
        if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
            this.enumValues = this.enumValues.concat(validationResult.enumValues);
            for (var _i = 0, _a = this.problems; _i < _a.length; _i++) {
                var error = _a[_i];
                if (error.code === ErrorCode.EnumValueMismatch) {
                    error.getMessage = function () { return localize('enumWarning', 'Value is not accepted. Valid values: {0}.', _this.enumValues.map(function (v) { return JSON.stringify(v); }).join(', ')); };
                }
            }
        }
    };
    ValidationResult.prototype.mergePropertyMatch = function (propertyValidationResult) {
        this.mergeSubResult(propertyValidationResult);
        this.propertiesMatches++;
        if (propertyValidationResult.enumValueMatch || !this.hasProblems() && propertyValidationResult.propertiesMatches) {
            this.propertiesValueMatches++;
        }
        if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues && propertyValidationResult.enumValues.length === 1) {
            this.primaryValueMatches++;
        }
    };
    ValidationResult.prototype.compareGeneric = function (other) {
        var hasProblems = this.hasProblems();
        if (hasProblems !== other.hasProblems()) {
            return hasProblems ? -1 : 1;
        }
        if (hasProblems) {
            var depthOfFirstProblem = this.problemDepths.findIndex(function (value, index) { return value > 0; });
            var depthOfOtherFirstProblem = other.problemDepths.findIndex(function (value, index) { return value > 0; });
            if (depthOfFirstProblem != depthOfOtherFirstProblem) {
                return depthOfFirstProblem - depthOfOtherFirstProblem;
            }
        }
        if (this.enumValueMatch !== other.enumValueMatch) {
            return other.enumValueMatch ? -1 : 1;
        }
        if (this.propertiesValueMatches !== other.propertiesValueMatches) {
            return this.propertiesValueMatches - other.propertiesValueMatches;
        }
        if (this.primaryValueMatches !== other.primaryValueMatches) {
            return this.primaryValueMatches - other.primaryValueMatches;
        }
        return this.propertiesMatches - other.propertiesMatches;
    };
    ValidationResult.prototype.compareKubernetes = function (other) {
        var hasProblems = this.hasProblems();
        if (this.propertiesMatches !== other.propertiesMatches) {
            return this.propertiesMatches - other.propertiesMatches;
        }
        if (this.enumValueMatch !== other.enumValueMatch) {
            return other.enumValueMatch ? -1 : 1;
        }
        if (this.primaryValueMatches !== other.primaryValueMatches) {
            return this.primaryValueMatches - other.primaryValueMatches;
        }
        if (this.propertiesValueMatches !== other.propertiesValueMatches) {
            return this.propertiesValueMatches - other.propertiesValueMatches;
        }
        if (hasProblems !== other.hasProblems()) {
            return hasProblems ? -1 : 1;
        }
        return this.propertiesMatches - other.propertiesMatches;
    };
    return ValidationResult;
}());
exports.ValidationResult = ValidationResult;
var JSONDocument = /** @class */ (function () {
    function JSONDocument(root, syntaxErrors) {
        this.root = root;
        this.syntaxErrors = syntaxErrors;
    }
    JSONDocument.prototype.getNodeFromOffset = function (offset) {
        return this.root && this.root.getNodeFromOffset(offset);
    };
    JSONDocument.prototype.getNodeFromOffsetEndInclusive = function (offset) {
        return this.root && this.root.getNodeFromOffsetEndInclusive(offset);
    };
    JSONDocument.prototype.visit = function (visitor) {
        if (this.root) {
            this.root.visit(visitor);
        }
    };
    JSONDocument.prototype.configureSettings = function (parserSettings) {
        if (this.root) {
            this.root.setParserSettings(parserSettings);
        }
    };
    JSONDocument.prototype.validate = function (schema) {
        if (this.root && schema) {
            var validationResult = new ValidationResult();
            this.root.validate(schema, validationResult, new NoOpSchemaCollector());
            return validationResult.problems;
        }
        return null;
    };
    JSONDocument.prototype.getMatchingSchemas = function (schema, focusOffset, exclude) {
        if (focusOffset === void 0) { focusOffset = -1; }
        if (exclude === void 0) { exclude = null; }
        var matchingSchemas = new SchemaCollector(focusOffset, exclude);
        var validationResult = new ValidationResult();
        if (this.root && schema) {
            this.root.validate(schema, validationResult, matchingSchemas);
        }
        return matchingSchemas.schemas;
    };
    JSONDocument.prototype.getValidationProblems = function (schema, focusOffset, exclude) {
        if (focusOffset === void 0) { focusOffset = -1; }
        if (exclude === void 0) { exclude = null; }
        var matchingSchemas = new SchemaCollector(focusOffset, exclude);
        var validationResult = new ValidationResult();
        if (this.root && schema) {
            this.root.validate(schema, validationResult, matchingSchemas);
        }
        return validationResult.problems;
    };
    return JSONDocument;
}());
exports.JSONDocument = JSONDocument;
//Alternative comparison is specifically used by the kubernetes/openshift schema but may lead to better results then genericComparison depending on the schema
function alternativeComparison(subValidationResult, bestMatch, subSchema, subMatchingSchemas) {
    var compareResult = subValidationResult.compareKubernetes(bestMatch.validationResult);
    if (compareResult > 0) {
        // our node is the best matching so far
        bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
    }
    else if (compareResult === 0) {
        // there's already a best matching but we are as good
        bestMatch.matchingSchemas.merge(subMatchingSchemas);
        bestMatch.validationResult.mergeEnumValues(subValidationResult);
    }
    return bestMatch;
}
//genericComparison tries to find the best matching schema using a generic comparison
function genericComparison(maxOneMatch, subValidationResult, bestMatch, subSchema, subMatchingSchemas) {
    if (!maxOneMatch && !subValidationResult.hasProblems() && !bestMatch.validationResult.hasProblems()) {
        // no errors, both are equally good matches
        bestMatch.matchingSchemas.merge(subMatchingSchemas);
        bestMatch.validationResult.propertiesMatches += subValidationResult.propertiesMatches;
        bestMatch.validationResult.propertiesValueMatches += subValidationResult.propertiesValueMatches;
    }
    else {
        var compareResult = subValidationResult.compareGeneric(bestMatch.validationResult);
        if (compareResult > 0) {
            // our node is the best matching so far
            bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
        }
        else if (compareResult === 0) {
            // there's already a best matching but we are as good
            bestMatch.matchingSchemas.merge(subMatchingSchemas);
            bestMatch.validationResult.mergeEnumValues(subValidationResult);
        }
    }
    return bestMatch;
}
//# sourceMappingURL=jsonParser.js.map