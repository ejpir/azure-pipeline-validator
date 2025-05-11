"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
var ErrorHandler = /** @class */ (function () {
    function ErrorHandler(textDocument) {
        this.errorResultsList = [];
        this.textDocument = textDocument;
    }
    ErrorHandler.prototype.addErrorResult = function (errorNode, errorMessage, errorType) {
        this.errorResultsList.push({
            severity: errorType,
            range: {
                start: this.textDocument.positionAt(errorNode.startPosition),
                end: this.textDocument.positionAt(errorNode.endPosition)
            },
            message: errorMessage
        });
    };
    ErrorHandler.prototype.getErrorResultsList = function () {
        return this.errorResultsList;
    };
    return ErrorHandler;
}());
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=errorHandler.js.map