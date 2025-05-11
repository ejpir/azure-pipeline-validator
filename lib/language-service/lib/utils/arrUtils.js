"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDuplicatesObj = exports.getLineOffsets = exports.removeDuplicates = void 0;
function removeDuplicates(arr, prop) {
    var new_arr = [];
    var lookup = {};
    for (var i in arr) {
        lookup[arr[i][prop]] = arr[i];
    }
    for (i in lookup) {
        new_arr.push(lookup[i]);
    }
    return new_arr;
}
exports.removeDuplicates = removeDuplicates;
function getLineOffsets(textDocString) {
    var lineOffsets = [];
    var text = textDocString;
    var isLineStart = true;
    for (var i = 0; i < text.length; i++) {
        if (isLineStart) {
            lineOffsets.push(i);
            isLineStart = false;
        }
        var ch = text.charAt(i);
        isLineStart = (ch === '\r' || ch === '\n');
        if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
            i++;
        }
    }
    if (isLineStart && text.length > 0) {
        lineOffsets.push(text.length);
    }
    return lineOffsets;
}
exports.getLineOffsets = getLineOffsets;
function removeDuplicatesObj(objArray) {
    var nonDuplicateSet = new Set();
    var nonDuplicateArr = [];
    for (var obj in objArray) {
        var currObj = objArray[obj];
        var stringifiedObj = JSON.stringify(currObj);
        if (!nonDuplicateSet.has(stringifiedObj)) {
            nonDuplicateArr.push(currObj);
            nonDuplicateSet.add(stringifiedObj);
        }
    }
    return nonDuplicateArr;
}
exports.removeDuplicatesObj = removeDuplicatesObj;
//# sourceMappingURL=arrUtils.js.map