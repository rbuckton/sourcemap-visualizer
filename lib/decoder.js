/// <reference path="node.d.ts" />
var path = require('path');
var utils = require('./utils');
var vlq = require('./vlq');
var CharacterCode;
(function (CharacterCode) {
    CharacterCode[CharacterCode["Comma"] = 44] = "Comma";
    CharacterCode[CharacterCode["Semicolon"] = 59] = "Semicolon";
    CharacterCode[CharacterCode["LessThan"] = 60] = "LessThan";
    CharacterCode[CharacterCode["GreaterThan"] = 62] = "GreaterThan";
})(CharacterCode || (CharacterCode = {}));
function decode(mapFile) {
    var mapRoot = utils.absolute(path.dirname(mapFile));
    var generatedFileContent;
    var sections = [];
    var sectionMaps = [];
    var sectionMapsGeneratedFileContent = [];
    var sectionMapsContent = [];
    var sectionNameOffsets = [];
    var sectionSourceOffsets = [];
    var sectionMappingOffsets = [];
    var sectionScopeOffsets = [];
    var sectionLocalOffsets = [];
    var sources = [];
    var sourcesContent = [];
    var names = [];
    var mappings = [];
    var generatedMappingCache = [];
    var sourceMappingCache = [];
    var sectionGeneratedMappingCache = [];
    var scopes = [];
    var locals = [];
    var lastSectionNameOffset = 0;
    var lastSectionSourceOffset = 0;
    var lastSectionMappingOffset = 0;
    var lastSectionScopeOffset = 0;
    var lastSectionLocalOffset = 0;
    var mapContent = utils.readFile(mapFile);
    var map = JSON.parse(mapContent);
    var version;
    var generatedFile;
    if ("sections" in map) {
        decodeIndexMap(map);
    }
    else {
        decodeSourceMap(map);
    }
    return {
        generatedFile: generatedFile,
        isIndexMap: "sections" in map,
        getIndexMap: getIndexMap,
        getIndexMapContent: getIndexMapContent,
        getSourceMaps: getSourceMaps,
        getSourceMap: getSourceMap,
        getSourceMapContent: getSourceMapContent,
        getSourceMapGeneratedFileContent: getSourceMapGeneratedFileContent,
        getGeneratedFileContent: getGeneratedFileContent,
        getSections: getSections,
        getSection: getSection,
        getNames: getNames,
        getNamesInSection: getNamesInSection,
        getName: getName,
        getNameInSection: getNameInSection,
        getSources: getSources,
        getSourcesInSection: getSourcesInSection,
        getSource: getSource,
        getSourceInSection: getSourceInSection,
        getSourceContent: getSourceContent,
        getSourceContentInSection: getSourceContentInSection,
        getMappings: getMappings,
        getMappingsInSection: getMappingsInSection,
        getMapping: getMapping,
        getMappingInSection: getMappingInSection,
        getMappingsAtGeneratedLine: getMappingsAtGeneratedLine,
        getMappingAtGeneratedLocation: getMappingAtGeneratedLocation,
        getMappingAtGeneratedLocationInSection: getMappingAtGeneratedLocationInSection,
        getCandidateMappingsAtSourceLine: getCandidateMappingsAtSourceLine,
        getCandidateMappingsAtSourceLocation: getCandidateMappingsAtSourceLocation,
        getCandidateMappingsAtSourceLocationInSection: getCandidateMappingsAtSourceLocationInSection,
        getScopes: getScopes,
        getScopesInSection: getScopesInSection,
        getScope: getScope,
        getScopeInSection: getScopeInSection,
        getNarrowestScopeAtGeneratedLocation: getNarrowestScopeAtGeneratedLocation,
        getNarrowestScopeAtGeneratedLocationInSection: getNarrowestScopeAtGeneratedLocationInSection,
        getCandidateNarrowestScopesAtSourceLocation: getCandidateNarrowestScopesAtSourceLocation,
        getCandidateNarrowestScopesAtSourceLocationInSection: getCandidateNarrowestScopesAtSourceLocationInSection,
        getLocals: getLocals,
        getLocalsInSection: getLocalsInSection,
        getLocal: getLocal,
        getLocalInSection: getLocalInSection,
        getLocalAtGeneratedLocationForGeneratedName: getLocalAtGeneratedLocationForGeneratedName,
        getLocalAtGeneratedLocationInSectionForGeneratedName: getLocalAtGeneratedLocationInSectionForGeneratedName,
        getLocalAtGeneratedLocationForSourceName: getLocalAtGeneratedLocationForSourceName,
        getLocalAtGeneratedLocationInSectionForSourceName: getLocalAtGeneratedLocationInSectionForSourceName,
        getCandidateLocalsAtSourceLocationForGeneratedName: getCandidateLocalsAtSourceLocationForGeneratedName,
        getCandidateLocalsAtSourceLocationInSectionForGeneratedName: getCandidateLocalsAtSourceLocationInSectionForGeneratedName,
        getCandidateLocalsAtSourceLocationForSourceName: getCandidateLocalsAtSourceLocationForSourceName,
        getCandidateLocalsAtSourceLocationInSectionForSourceName: getCandidateLocalsAtSourceLocationInSectionForSourceName,
        getMediaTypes: getMediaTypes,
        getMediaTypesInSection: getMediaTypesInSection,
    };
    function decodeIndexMap(indexMap) {
        version = indexMap.version;
        generatedFile = utils.resolve(mapRoot, indexMap.file);
        for (var sectionIndex = 0; sectionIndex < indexMap.sections.length; sectionIndex++) {
            var section = indexMap.sections[sectionIndex];
            var sectionFile;
            var sectionMapContent;
            var sectionMap;
            if (section.map) {
                sectionMap = section.map;
                sectionMapContent = JSON.stringify(map, undefined, "  ");
                sectionFile = utils.resolve(mapRoot, sectionMap.file);
            }
            else if (section.url) {
                var url = utils.resolve(mapRoot, section.url);
                try {
                    sectionMapContent = utils.readFile(url);
                    sectionMap = JSON.parse(sectionMapContent);
                    sectionFile = utils.resolve(mapRoot, sectionMap.file);
                }
                catch (e) {
                    sectionMapContent = "";
                }
            }
            var parsedSection = {
                sectionIndex: sectionIndex,
                generatedFile: sectionFile,
                generatedLine: section.offset.line,
                generatedColumn: section.offset.column
            };
            if (sectionMap) {
                decodeSection(parsedSection, sectionMap, sectionMapContent);
            }
        }
    }
    function decodeSourceMap(sourceMap) {
        version = sourceMap.version;
        generatedFile = utils.resolve(mapRoot, sourceMap.file);
        var parsedSection = {
            sectionIndex: 0,
            generatedLine: 0,
            generatedColumn: 0,
            generatedFile: generatedFile
        };
        decodeSection(parsedSection, sourceMap, mapContent);
    }
    function decodeSection(section, sourceMap, mapContent) {
        sections[section.sectionIndex] = section;
        sectionMaps[section.sectionIndex] = sourceMap;
        sectionMapsContent[section.sectionIndex] = mapContent;
        sectionNameOffsets[section.sectionIndex] = lastSectionNameOffset;
        sectionSourceOffsets[section.sectionIndex] = lastSectionSourceOffset;
        sectionMappingOffsets[section.sectionIndex] = lastSectionMappingOffset;
        sectionScopeOffsets[section.sectionIndex] = lastSectionScopeOffset;
        sectionLocalOffsets[section.sectionIndex] = lastSectionLocalOffset;
        decodeSectionSources(section, sourceMap);
        decodeSectionNames(section, sourceMap);
        decodeSectionMappings(section, sourceMap);
        decodeSectionScopes(section, sourceMap);
        decodeSectionLocals(section, sourceMap);
        decodeSectionMediaTypes(section, sourceMap);
    }
    function decodeSectionSources(section, sourceMap) {
        lastSectionSourceOffset += sourceMap.sources.length;
    }
    function decodeSectionNames(section, sourceMap) {
        if (sourceMap.names) {
            lastSectionNameOffset += sourceMap.names.length;
        }
    }
    function decodeSectionMappings(section, sourceMap) {
        var sectionNameOffset = sectionNameOffsets[section.sectionIndex];
        var sectionSourceOffset = sectionSourceOffsets[section.sectionIndex];
        var sectionMappingOffset = sectionMappingOffsets[section.sectionIndex];
        var generatedLine = section.generatedLine;
        var generatedColumn = section.generatedColumn;
        var sectionGeneratedLine = 0;
        var sectionGeneratedColumn = 0;
        var sectionNameIndex = 0;
        var sectionSourceIndex = 0;
        var sectionMappingIndex = 0;
        var sourceLine = 0;
        var sourceColumn = 0;
        var startPos = 0;
        for (var pos = 0; pos <= sourceMap.mappings.length; pos++) {
            var ch = sourceMap.mappings.charCodeAt(pos);
            if (ch === 59 /* Semicolon */ || ch === 44 /* Comma */ || isNaN(ch)) {
                if (pos > startPos) {
                    var segment = vlq.decodeChars(sourceMap.mappings, startPos, pos);
                    var generatedColumnOffset = segment[0];
                    generatedColumn += generatedColumnOffset;
                    sectionGeneratedColumn += generatedColumnOffset;
                    var mapping = {
                        mappingIndex: sectionMappingOffset + sectionMappingIndex,
                        sectionIndex: section.sectionIndex,
                        sectionMappingIndex: sectionMappingIndex,
                        generatedLine: generatedLine,
                        sectionGeneratedLine: sectionGeneratedLine,
                        generatedColumnOffset: generatedColumnOffset,
                        generatedColumn: generatedColumn,
                        sectionGeneratedColumn: sectionGeneratedColumn,
                    };
                    var generatedLineCache = generatedMappingCache[generatedLine] || (generatedMappingCache[generatedLine] = []);
                    generatedLineCache.push(mapping);
                    var sectionGeneratedLocationCache = sectionGeneratedMappingCache[section.sectionIndex] || (sectionGeneratedMappingCache[section.sectionIndex] = []);
                    var sectionGeneratedLineCache = sectionGeneratedLocationCache[sectionGeneratedLine] || (sectionGeneratedLocationCache[sectionGeneratedLine] = []);
                    sectionGeneratedLineCache.push(mapping);
                    if (segment.length > 3) {
                        var sourceIndexOffset = segment[1];
                        sectionSourceIndex += sourceIndexOffset;
                        mapping.sourceIndexOffset = sourceIndexOffset;
                        mapping.source = getSourceInSection(section.sectionIndex, sectionSourceIndex);
                        var sourceLineOffset = segment[2];
                        sourceLine += sourceLineOffset;
                        mapping.sourceLineOffset = sourceLineOffset;
                        mapping.sourceLine = sourceLine;
                        var sourceColumnOffset = segment[3];
                        sourceColumn += sourceColumnOffset;
                        mapping.sourceColumnOffset = sourceColumnOffset;
                        mapping.sourceColumn = sourceColumn;
                        if (segment.length > 4) {
                            var nameIndexOffset = segment[4];
                            sectionNameIndex += nameIndexOffset;
                            mapping.nameIndexOffset = nameIndexOffset;
                            mapping.name = getNameInSection(section.sectionIndex, sectionNameIndex);
                        }
                        var sourceCache = sourceMappingCache[mapping.source.sourceIndex] || (sourceMappingCache[mapping.source.sourceIndex] = []);
                        var sourceLineCache = sourceCache[sourceLine] || (sourceCache[sourceLine] = []);
                        sourceLineCache.push(mapping);
                    }
                    mappings[mapping.mappingIndex] = mapping;
                    sectionMappingIndex++;
                }
                startPos = pos + 1;
            }
            if (ch === 59 /* Semicolon */) {
                generatedColumn = 0;
                generatedLine++;
                sectionGeneratedColumn = 0;
                sectionGeneratedLine++;
            }
        }
        if (sourceMap.names) {
            lastSectionNameOffset += sourceMap.names.length;
        }
    }
    function decodeSectionScopes(section, sourceMap) {
        var scopesData = sourceMap.x_ms_scopes;
        if (!scopesData)
            return;
        var sectionScopeIndex = 0;
        var scopeIndex = 0;
        var line = section.generatedLine;
        var column = section.generatedColumn;
        var sectionLine = 0;
        var sectionColumn = 0;
        var parent;
        var current;
        var startPos = 0;
        for (var pos = 0; pos < scopesData.length; pos++) {
            var ch = scopesData.charCodeAt(pos);
            if (ch === 62 /* GreaterThan */ || ch === 60 /* LessThan */) {
                if (pos > startPos) {
                    var segment = vlq.decodeChars(scopesData, startPos, pos);
                    var lineOffset = segment[0];
                    var columnOffset = segment[1];
                    line += lineOffset;
                    column += columnOffset;
                    sectionLine += lineOffset;
                    sectionColumn += columnOffset;
                    if (ch === 62 /* GreaterThan */) {
                        // enter new scope
                        sectionScopeIndex++;
                        parent = current;
                        current = {
                            scopeIndex: lastSectionScopeOffset + sectionScopeIndex,
                            sectionIndex: section.sectionIndex,
                            sectionScopeIndex: sectionScopeIndex,
                            parent: parent,
                            startLine: line,
                            startColumn: column,
                            sectionStartLine: sectionLine,
                            sectionStartColumn: sectionColumn,
                            endLine: undefined,
                            endColumn: undefined,
                            sectionEndLine: undefined,
                            sectionEndColumn: undefined,
                            nested: [],
                            locals: []
                        };
                        if (parent) {
                            parent.nested.push(current);
                        }
                        scopes[current.scopeIndex] = current;
                    }
                    else if (ch === 60 /* LessThan */) {
                        // exit current scope
                        current = parent;
                        current.endLine = line;
                        current.endColumn = column;
                        current.sectionEndLine = sectionLine;
                        current.sectionEndColumn = sectionColumn;
                        parent = current.parent;
                    }
                    startPos = pos + 1;
                }
            }
        }
        lastSectionScopeOffset = scopes.length;
    }
    function decodeSectionLocals(section, sourceMap) {
        var localsData = sourceMap.x_ms_locals;
        if (!localsData)
            return;
        var sectionScopeIndexOffset = sectionScopeOffsets[section.sectionIndex];
        var sectionNameIndexOffset = sectionNameOffsets[section.sectionIndex];
        var sectionScopeIndex = 0;
        var sectionNameIndex = 0;
        var sectionLocalIndex = 0;
        var names = sourceMap.names;
        var startPos = 0;
        for (var pos = 0; pos <= localsData.length; pos++) {
            var ch = localsData.charCodeAt(pos);
            if (ch === 59 /* Semicolon */ || ch === 44 /* Comma */ || isNaN(ch)) {
                if (startPos > pos) {
                    var segment = vlq.decodeChars(localsData, startPos, pos);
                    sectionLocalIndex++;
                    sectionNameIndex += segment[0];
                    var generatedName = getNameInSection(section.sectionIndex, sectionNameIndex);
                    var isHidden = segment.length === 1;
                    if (!isHidden) {
                        sectionNameIndex += segment[1];
                        var sourceName = getNameInSection(section.sectionIndex, sectionNameIndex);
                    }
                    var isRenamed = !isHidden && generatedName.text !== sourceName.text;
                    var scope = scopes[sectionScopeIndexOffset + sectionScopeIndex];
                    var local = {
                        localIndex: lastSectionLocalOffset + sectionLocalIndex,
                        sectionIndex: section.sectionIndex,
                        sectionLocalIndex: sectionLocalIndex,
                        scope: scope,
                        generatedName: generatedName,
                        sourceName: sourceName,
                        isHidden: isHidden,
                        isRenamed: isRenamed
                    };
                    locals[local.localIndex] = local;
                    scope.locals.push(local);
                    startPos = pos + 1;
                }
                if (ch === 59 /* Semicolon */) {
                    sectionScopeIndex++;
                }
            }
        }
    }
    function decodeSectionMediaTypes(section, sourceMap) {
        var mediaTypesData = sourceMap.x_ms_mediaTypes;
        if (!mediaTypesData)
            return;
        var mediaTypeIndex = 0;
        var sourcesMediaTypeData = sourceMap.x_ms_sourceMediaTypes;
        var offsets;
        if (sourcesMediaTypeData) {
            offsets = vlq.decodeChars(sourcesMediaTypeData, 0, sourcesMediaTypeData.length);
        }
        for (var sectionSourceIndex = 0; sectionSourceIndex < sourceMap.sources.length; sectionSourceIndex++) {
            if (offsets && sectionSourceIndex < offsets.length) {
                mediaTypeIndex += offsets[sectionSourceIndex];
            }
            var mediaType;
            if (mediaTypeIndex < mediaTypesData.length) {
                mediaType = mediaTypesData[mediaTypeIndex];
            }
            else {
                mediaType = mediaTypesData[mediaTypesData.length - 1];
            }
            var source = getSourceInSection(section.sectionIndex, sectionSourceIndex);
            source.mediaType = mediaType;
        }
    }
    function getIndexMap() {
        if ("sections" in map) {
            return map;
        }
    }
    function getIndexMapContent() {
        if ("sections" in map) {
            return mapContent;
        }
    }
    function getSourceMaps() {
        return sectionMaps.slice();
    }
    function getSourceMap(sectionIndex) {
        return sectionMaps[sectionIndex];
    }
    function getSourceMapContent(sectionIndex) {
        return sectionMapsContent[sectionIndex];
    }
    function getGeneratedFileContent() {
        if (typeof generatedFileContent !== "string") {
            generatedFileContent = utils.readFile(generatedFile);
        }
        return generatedFileContent;
    }
    function getSourceMapGeneratedFileContent(sectionIndex) {
        if (sectionIndex in sectionMapsGeneratedFileContent) {
            return sectionMapsGeneratedFileContent[sectionIndex];
        }
        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap === map) {
            return getGeneratedFileContent();
        }
        else if (sourceMap) {
            var url = utils.resolve(mapRoot, sourceMap.file);
            var content;
            try {
                content = utils.readFile(url);
            }
            catch (e) {
                content = "";
            }
            sectionMapsGeneratedFileContent[sectionIndex] = content;
            return content;
        }
    }
    function getSections() {
        return sections.slice();
    }
    function getSection(sectionIndex) {
        return sections[sectionIndex];
    }
    function getSectionForName(nameIndex) {
        var parsedSection = sections[0];
        for (var sectionIndex = 1; sectionIndex < sectionNameOffsets.length; sectionIndex++) {
            if (sectionNameOffsets[sectionIndex] < nameIndex) {
                parsedSection = sections[sectionIndex];
            }
            else {
                break;
            }
        }
        return parsedSection;
    }
    function getNames() {
        var result = [];
        for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            result = result.concat(getNamesInSection(sectionIndex));
        }
        return result;
    }
    function getNamesInSection(sectionIndex) {
        var result = [];
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.names) {
            for (var sectionNameIndex = 0; sectionNameIndex < sourceMap.names.length; sectionNameIndex++) {
                result.push(getNameInSection(sectionIndex, sectionNameIndex));
            }
        }
        return result;
    }
    function getName(nameIndex) {
        if (nameIndex in names) {
            return names[nameIndex];
        }
        var parsedSection = getSectionForName(nameIndex);
        if (parsedSection) {
            var sectionNameIndex = nameIndex - sectionNameOffsets[parsedSection.sectionIndex];
            return getNameInSection(parsedSection.sectionIndex, sectionNameIndex);
        }
    }
    function getNameInSection(sectionIndex, sectionNameIndex) {
        var nameIndex = sectionNameOffsets[sectionIndex] + sectionNameIndex;
        if (nameIndex in names) {
            return names[nameIndex];
        }
        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.names && sectionNameIndex < sourceMap.names.length) {
            var name = {
                nameIndex: nameIndex,
                sectionIndex: sectionIndex,
                sectionNameIndex: sectionNameIndex,
                text: sourceMap.names[sectionNameIndex]
            };
            names[nameIndex] = name;
            return name;
        }
    }
    function getSectionForSource(sourceIndex) {
        var parsedSection = sections[0];
        for (var sectionIndex = 1; sectionIndex < sectionSourceOffsets.length; sectionIndex++) {
            if (sectionSourceOffsets[sectionIndex] < sourceIndex) {
                parsedSection = sections[sectionIndex];
            }
            else {
                break;
            }
        }
        return parsedSection;
    }
    function getSources() {
        var result = [];
        for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            result = result.concat(getSourcesInSection(sectionIndex));
        }
        return result;
    }
    function getSourcesInSection(sectionIndex) {
        var result = [];
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.sources) {
            for (var sectionSourceIndex = 0; sectionSourceIndex < sourceMap.sources.length; sectionSourceIndex++) {
                result.push(getSourceInSection(sectionIndex, sectionSourceIndex));
            }
        }
        return result;
    }
    function getSource(sourceIndex) {
        if (sourceIndex in sources) {
            return sources[sourceIndex];
        }
        var parsedSection = getSectionForSource(sourceIndex);
        if (parsedSection) {
            var sectionSourceIndex = sourceIndex - sectionSourceOffsets[parsedSection.sectionIndex];
            return getSourceInSection(parsedSection.sectionIndex, sectionSourceIndex);
        }
    }
    function getSourceInSection(sectionIndex, sectionSourceIndex) {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        if (sourceIndex in sources) {
            return sources[sourceIndex];
        }
        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.sources && sectionSourceIndex < sourceMap.sources.length) {
            var url = sourceMap.sources[sectionSourceIndex];
            if (sourceMap.sourcesContent && typeof sourceMap.sourcesContent[sectionSourceIndex] !== "string") {
                if (sourceMap.sourceRoot) {
                    url = utils.resolve(sourceMap.sourceRoot, url);
                }
                url = utils.resolve(mapRoot, url);
            }
            var source = {
                sourceIndex: sourceIndex,
                sectionIndex: sectionIndex,
                sectionSourceIndex: sectionSourceIndex,
                url: url
            };
            sources[sourceIndex] = source;
            return source;
        }
    }
    function getSourceContent(sourceIndex) {
        if (sourceIndex in sourcesContent) {
            return sourcesContent[sourceIndex];
        }
        var parsedSection = getSectionForSource(sourceIndex);
        if (parsedSection) {
            var sectionSourceIndex = sourceIndex - sectionSourceOffsets[parsedSection.sectionIndex];
            return getSourceContentInSection(parsedSection.sectionIndex, sectionSourceIndex);
        }
    }
    function getSourceContentInSection(sectionIndex, sectionSourceIndex) {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        if (sourceIndex in sourcesContent) {
            return sourcesContent[sourceIndex];
        }
        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.sources && sectionSourceIndex < sourceMap.sources.length) {
            var sourceContent;
            if (sourceMap.sourcesContent && sourceIndex < sourceMap.sourcesContent.length) {
                sourceContent = sourceMap.sourcesContent[sectionSourceIndex];
            }
            if (typeof sourceContent !== "string") {
                var source = getSourceInSection(sectionIndex, sectionSourceIndex);
                if (source) {
                    try {
                        sourceContent = utils.readFile(source.url);
                    }
                    catch (e) {
                    }
                }
            }
            sourcesContent[sourceIndex] = sourceContent;
            return sourceContent;
        }
    }
    function getMappings() {
        return mappings.slice(0);
    }
    function getMappingsInSection(sectionIndex) {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionMappingOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionMappingOffsets[sectionIndex + 1] : lastSectionMappingOffset;
            return mappings.slice(start, end);
        }
        return [];
    }
    function getMapping(mappingIndex) {
        return mappings[mappingIndex];
    }
    function getMappingInSection(sectionIndex, sectionMappingIndex) {
        var mappingIndex = sectionMappingOffsets[sectionIndex] + sectionMappingIndex;
        return getMapping(mappingIndex);
    }
    function getMappingsAtGeneratedLine(generatedLine) {
        var generatedLineCache = generatedMappingCache[generatedLine];
        if (generatedLineCache) {
            var result = generatedLineCache.slice();
            return result;
        }
        return [];
    }
    function getMappingAtGeneratedLocation(generatedLine, generatedColumn) {
        var generatedLineCache = generatedMappingCache[generatedLine];
        if (generatedLineCache) {
            for (var i = 0; i < generatedLineCache.length; i++) {
                var mapping = generatedLineCache[i];
                if (mapping.generatedColumn === generatedColumn) {
                    return mapping;
                }
            }
        }
    }
    function getMappingAtGeneratedLocationInSection(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn) {
        var sectionGeneratedLocationCache = sectionGeneratedMappingCache[sectionIndex];
        if (sectionGeneratedLocationCache) {
            var sectionGeneratedLineCache = sectionGeneratedLocationCache[sectionGeneratedLine];
            if (sectionGeneratedLineCache) {
                return sectionGeneratedLineCache[sectionGeneratedColumn];
            }
        }
    }
    function getCandidateMappingsAtSourceLine(sourceIndex, sourceLine) {
        var sourceCache = sourceMappingCache[sourceIndex];
        if (sourceCache) {
            var sourceLineCache = sourceCache[sourceLine];
            if (sourceLineCache) {
                var result = sourceLineCache.slice();
                result.sort(function (x, y) { return (x.sourceLine - y.sourceLine) || (x.sourceColumn - y.sourceColumn); });
                return result;
            }
        }
        return [];
    }
    function getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn) {
        var mappings = getCandidateMappingsAtSourceLine(sourceIndex, sourceLine);
        var candidates = mappings.filter(function (mapping) { return mapping.sourceColumn === sourceColumn; });
        return candidates;
    }
    function getCandidateMappingsAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn) {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        return getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
    }
    function getScopes(topMost) {
        if (topMost) {
            return scopes.filter(function (scope) { return !!scope.parent; });
        }
        return scopes.slice();
    }
    function getScopesInSection(sectionIndex, topMost) {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionScopeOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionScopeOffsets[sectionIndex + 1] : lastSectionScopeOffset;
            var result = scopes.slice(start, end);
            if (topMost) {
                result = result.filter(function (scope) { return !!scope.parent; });
            }
            return result;
        }
        return [];
    }
    function getScope(scopeIndex) {
        return scopes[scopeIndex];
    }
    function getScopeInSection(sectionIndex, sectionScopeIndex) {
        var scopeIndex = sectionScopeOffsets[sectionIndex] + sectionScopeIndex;
        return getScope(scopeIndex);
    }
    function getNarrowestScopeAtGeneratedLocation(generatedLine, generatedColumn) {
        var narrowestScope;
        for (var scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            var scope = scopes[scopeIndex];
            if (compareOffsets(scope.startLine, scope.startColumn, generatedLine, generatedColumn) > 0) {
                continue;
            }
            else if (compareOffsets(scope.endLine, scope.endColumn, generatedLine, generatedColumn) < 0) {
                continue;
            }
            if (!narrowestScope || compareOffsets(narrowestScope.startLine, narrowestScope.startColumn, scope.startLine, scope.startColumn) < 0 || compareOffsets(narrowestScope.endLine, narrowestScope.endColumn, scope.endLine, scope.endColumn) < 0) {
                narrowestScope = scope;
            }
        }
        return narrowestScope;
    }
    function getNarrowestScopeAtGeneratedLocationInSection(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn) {
        var scopes = getScopesInSection(sectionIndex);
        var narrowestScope;
        for (var scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            var scope = scopes[scopeIndex];
            if (compareOffsets(scope.sectionStartLine, scope.sectionStartColumn, sectionGeneratedLine, sectionGeneratedColumn) > 0) {
                continue;
            }
            else if (compareOffsets(scope.sectionEndLine, scope.sectionEndColumn, sectionGeneratedLine, sectionGeneratedColumn) < 0) {
                continue;
            }
            if (!narrowestScope || compareOffsets(narrowestScope.startLine, narrowestScope.startColumn, scope.startLine, scope.startColumn) < 0 || compareOffsets(narrowestScope.endLine, narrowestScope.endColumn, scope.endLine, scope.endColumn) < 0) {
                narrowestScope = scope;
            }
        }
        return narrowestScope;
    }
    function getCandidateNarrowestScopesAtSourceLocation(sourceIndex, sourceLine, sourceColumn) {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen = [];
        var result = [];
        mappings.forEach(function (mapping) {
            var scope = getNarrowestScopeAtGeneratedLocation(mapping.generatedLine, mapping.generatedColumn);
            if (!seen[scope.scopeIndex]) {
                seen[scope.scopeIndex] = true;
                result.push(scope);
            }
        });
        return result;
    }
    function getCandidateNarrowestScopesAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn) {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionIndex;
        return getCandidateNarrowestScopesAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
    }
    function getLocals() {
        return locals.slice();
    }
    function getLocalsInSection(sectionIndex) {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionLocalOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionLocalOffsets[sectionIndex + 1] : lastSectionLocalOffset;
            return locals.slice(start, end);
        }
        return [];
    }
    function getLocal(localIndex) {
        return locals[localIndex];
    }
    function getLocalInSection(sectionIndex, sectionLocalIndex) {
        var localIndex = sectionLocalOffsets[sectionIndex] + sectionLocalIndex;
        return getLocal(localIndex);
    }
    function getLocalAtGeneratedLocationForGeneratedName(generatedLine, generatedColumn, generatedName) {
        var scope = getNarrowestScopeAtGeneratedLocation(generatedLine, generatedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.generatedName.text === generatedName) {
                    return local;
                }
            }
        }
    }
    function getLocalAtGeneratedLocationInSectionForGeneratedName(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn, generatedName) {
        var scope = getNarrowestScopeAtGeneratedLocationInSection(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.generatedName.text === generatedName) {
                    return local;
                }
            }
        }
    }
    function getLocalAtGeneratedLocationForSourceName(generatedLine, generatedColumn, sourceName) {
        var scope = getNarrowestScopeAtGeneratedLocation(generatedLine, generatedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.sourceName && local.sourceName.text === sourceName) {
                    return local;
                }
            }
        }
    }
    function getLocalAtGeneratedLocationInSectionForSourceName(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn, sourceName) {
        var scope = getNarrowestScopeAtGeneratedLocationInSection(sectionIndex, sectionGeneratedLine, sectionGeneratedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.sourceName && local.sourceName.text === sourceName) {
                    return local;
                }
            }
        }
    }
    function getCandidateLocalsAtSourceLocationForGeneratedName(sourceIndex, sourceLine, sourceColumn, generatedName) {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen = [];
        var result = [];
        mappings.forEach(function (mapping) {
            var local = getLocalAtGeneratedLocationForGeneratedName(mapping.generatedLine, mapping.generatedColumn, generatedName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }
    function getCandidateLocalsAtSourceLocationInSectionForGeneratedName(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn, generatedName) {
        var mappings = getCandidateMappingsAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn);
        var seen = [];
        var result = [];
        mappings.forEach(function (mapping) {
            var local = getLocalAtGeneratedLocationForGeneratedName(mapping.generatedLine, mapping.generatedColumn, generatedName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }
    function getCandidateLocalsAtSourceLocationForSourceName(sourceIndex, sourceLine, sourceColumn, sourceName) {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen = [];
        var result = [];
        mappings.forEach(function (mapping) {
            var local = getLocalAtGeneratedLocationForSourceName(mapping.generatedLine, mapping.generatedColumn, sourceName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }
    function getCandidateLocalsAtSourceLocationInSectionForSourceName(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn, sourceName) {
        var mappings = getCandidateMappingsAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn);
        var seen = [];
        var result = [];
        mappings.forEach(function (mapping) {
            var local = getLocalAtGeneratedLocationForSourceName(mapping.generatedLine, mapping.generatedColumn, sourceName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }
    function getMediaTypes() {
        var result = [];
        for (var sectionIndex = 0; sectionIndex <= sections.length; sectionIndex++) {
            result = result.concat(getMediaTypesInSection(sectionIndex));
        }
        return result;
    }
    function getMediaTypesInSection(sectionIndex) {
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.x_ms_mediaTypes) {
            return sourceMap.x_ms_mediaTypes.slice();
        }
        return [];
    }
    function compareOffsets(line1, column1, line2, column2) {
        if (line1 < line2) {
            return -1;
        }
        else if (line1 > line2) {
            return +1;
        }
        else if (column1 < column2) {
            return -1;
        }
        else if (column1 > column2) {
            return +1;
        }
        return 0;
    }
}
exports.decode = decode;
//# sourceMappingURL=decoder.js.map