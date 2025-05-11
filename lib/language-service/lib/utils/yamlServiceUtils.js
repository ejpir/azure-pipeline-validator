"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionHelper = exports.nodeHolder = void 0;
var arrUtils_1 = require("./arrUtils");
exports.nodeHolder = "~"; //This won't conflict with any legal Pipelines nodes
var nodeLineEnding = ":\r\n";
var nodeHolderWithEnding = exports.nodeHolder + nodeLineEnding;
function is_EOL(c) {
    return (c === 0x0A /* LF */) || (c === 0x0D /* CR */);
}
function completionHelper(document, textDocumentPosition) {
    // Get the string we are looking at via a substring
    var lineNumber = textDocumentPosition.line;
    var lineOffsets = (0, arrUtils_1.getLineOffsets)(document.getText());
    var start = lineOffsets[lineNumber]; // Start of where the autocompletion is happening
    var end = 0; // End of where the autocompletion is happening
    if (lineOffsets[lineNumber + 1] !== undefined) {
        end = lineOffsets[lineNumber + 1];
    }
    else {
        end = document.getText().length;
    }
    while (end - 1 >= start && is_EOL(document.getText().charCodeAt(end - 1))) {
        end--;
    }
    var textLine = document.getText().substring(start, end);
    // Check if the string we are looking at is a node
    if (textLine.indexOf(":") === -1) {
        // We need to add the ":" to load the nodes
        var documentText = document.getText();
        var newText = "";
        // This is for the empty line case
        var trimmedText = textLine.trim();
        if (trimmedText.length === 0 || (trimmedText.length === 1 && trimmedText[0] === '-')) {
            // Add a temp node that is in the document but we don't use at all.
            newText = documentText.substring(0, start + textDocumentPosition.character) + nodeHolderWithEnding + documentText.substr(start + textDocumentPosition.character);
        }
        else {
            // Add a colon to the end of the current line so we can validate the node
            newText = documentText.substring(0, start + textLine.length) + nodeLineEnding + documentText.substr(lineOffsets[lineNumber + 1] || documentText.length);
        }
        return {
            newText: newText,
            newPosition: textDocumentPosition,
        };
    }
    else {
        // All the nodes are loaded
        textDocumentPosition.character = textDocumentPosition.character - 1;
        return {
            newText: document.getText(),
            newPosition: textDocumentPosition,
        };
    }
}
exports.completionHelper = completionHelper;
//# sourceMappingURL=yamlServiceUtils.js.map