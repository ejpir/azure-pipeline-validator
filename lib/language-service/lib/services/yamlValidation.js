/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAMLValidation = void 0;
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var jsonParser_1 = require("../parser/jsonParser");
var nls = require("vscode-nls");
var localize = nls.loadMessageBundle();
var YAMLValidation = /** @class */ (function () {
    function YAMLValidation(jsonSchemaService, promiseConstructor) {
        this.jsonSchemaService = jsonSchemaService;
        this.promise = promiseConstructor;
        this.validationEnabled = true;
    }
    YAMLValidation.prototype.configure = function (settings) {
        if (settings) {
            this.validationEnabled = settings.validate;
        }
    };
    YAMLValidation.prototype.doValidation = function (textDocument, yamlDocument) {
        if (!this.validationEnabled) {
            return this.promise.resolve([]);
        }
        if (yamlDocument.documents.length === 0) {
            //this is strange...
            return this.promise.resolve([]);
        }
        if (yamlDocument.documents.length > 1) {
            //The YAML parser is a little over-eager to call things different documents
            // see https://github.com/Microsoft/azure-pipelines-vscode/issues/219
            //so search for a specific error so that we can offer the user better guidance
            for (var _i = 0, _a = yamlDocument.documents; _i < _a.length; _i++) {
                var document_1 = _a[_i];
                for (var _b = 0, _c = document_1.errors; _b < _c.length; _b++) {
                    var docError = _c[_b];
                    if (docError.getMessage().includes("end of the stream or a document separator is expected")) {
                        var docErrorPosition = textDocument.positionAt(docError.start);
                        var errorLine = (docErrorPosition.line > 0) ? docErrorPosition.line - 1 : docErrorPosition.line;
                        return this.promise.resolve([{
                                severity: vscode_languageserver_types_1.DiagnosticSeverity.Error,
                                range: {
                                    start: {
                                        line: errorLine,
                                        character: 0
                                    },
                                    end: {
                                        line: errorLine + 1,
                                        character: 0
                                    }
                                },
                                message: localize('documentFormatError', 'Invalid YAML structure')
                            }]);
                    }
                }
            }
            return this.promise.resolve([{
                    severity: vscode_languageserver_types_1.DiagnosticSeverity.Error,
                    range: {
                        start: {
                            line: 0,
                            character: 0
                        },
                        end: textDocument.positionAt(textDocument.getText().length)
                    },
                    message: localize('multiDocumentError', 'Only single-document files are supported')
                }]);
        }
        var translateSeverity = function (problemSeverity) {
            if (problemSeverity === jsonParser_1.ProblemSeverity.Error) {
                return vscode_languageserver_types_1.DiagnosticSeverity.Error;
            }
            if (problemSeverity == jsonParser_1.ProblemSeverity.Warning) {
                return vscode_languageserver_types_1.DiagnosticSeverity.Warning;
            }
            return vscode_languageserver_types_1.DiagnosticSeverity.Hint;
        };
        return this.jsonSchemaService.getSchemaForResource(textDocument.uri).then(function (schema) {
            var diagnostics = [];
            var jsonDocument = yamlDocument.documents[0];
            jsonDocument.errors.forEach(function (err) {
                diagnostics.push({
                    severity: vscode_languageserver_types_1.DiagnosticSeverity.Error,
                    range: {
                        start: textDocument.positionAt(err.start),
                        end: textDocument.positionAt(err.end)
                    },
                    message: err.getMessage()
                });
            });
            jsonDocument.warnings.forEach(function (warn) {
                diagnostics.push({
                    severity: vscode_languageserver_types_1.DiagnosticSeverity.Warning,
                    range: {
                        start: textDocument.positionAt(warn.start),
                        end: textDocument.positionAt(warn.end)
                    },
                    message: warn.getMessage()
                });
            });
            if (schema) {
                var added = {};
                var problems = jsonDocument.getValidationProblems(schema.schema);
                problems.forEach(function (problem, index) {
                    var message = problem.getMessage();
                    var signature = '' + problem.location.start + ' ' + problem.location.end + ' ' + message;
                    if (!added[signature]) {
                        added[signature] = true;
                        diagnostics.push({
                            severity: translateSeverity(problem.severity),
                            range: {
                                start: textDocument.positionAt(problem.location.start),
                                end: textDocument.positionAt(problem.location.end)
                            },
                            message: message
                        });
                    }
                });
                if (schema.errors.length > 0) {
                    for (var _i = 0, _a = schema.errors; _i < _a.length; _i++) {
                        var curDiagnostic = _a[_i];
                        diagnostics.push({
                            severity: vscode_languageserver_types_1.DiagnosticSeverity.Error,
                            range: {
                                start: {
                                    line: 0,
                                    character: 0
                                },
                                end: {
                                    line: 0,
                                    character: 1
                                }
                            },
                            message: curDiagnostic
                        });
                    }
                }
            }
            return diagnostics;
        });
    };
    return YAMLValidation;
}());
exports.YAMLValidation = YAMLValidation;
//# sourceMappingURL=yamlValidation.js.map