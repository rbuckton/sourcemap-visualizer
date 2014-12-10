/// <reference path="node.d.ts" />
import path = require('path');
import utils = require('./utils');
import vlq = require('./vlq');

export interface IndexMap {
    version: number;
    file: string;
    sections: Section[];
}

export interface Section {
    offset: {
        line: number;
        column: number;
    };
    url?: string;
    map?: SourceMap;
}

export interface SourceMap {
    version: number;
    file: string;
    sourceRoot: string;
    sources: string[];
    names: string[];
    mappings: string;
    sourcesContent?: string[];
    x_ms_scopes?: string;
    x_ms_locals?: string;
    x_ms_mediaTypes?: string[];
    x_ms_sourceMediaTypes?: string;
}

export interface ParsedSourceMap {
    generatedFile: string;
    isIndexMap: boolean;
    getGeneratedFileContent(): string;
    getIndexMap(): IndexMap;
    getIndexMapContent(): string;
    getSourceMaps(): SourceMap[];
    getSourceMap(sectionIndex: number): SourceMap;
    getSourceMapContent(sectionIndex: number): string;
    getSourceMapGeneratedFileContent(sectionIndex: number): string;
    getSections(): ParsedSection[];
    getSection(sectionIndex: number): ParsedSection;
    getNames(): Name[];
    getNamesInSection(sectionIndex: number): Name[];
    getName(nameIndex: number): Name;
    getNameInSection(sectionIndex: number, sectionNameIndex: number): Name;
    getSources(): Source[];
    getSourcesInSection(sectionIndex: number): Source[];
    getSource(sourceIndex: number): Source;
    getSourceInSection(sectionIndex: number, sectionSourceIndex: number): Source;
    getSourceContent(sourceIndex: number): string;
    getSourceContentInSection(sectionIndex: number, sectionSourceIndex: number): string;
    getMappings(): Mapping[];
    getMappingsInSection(sectionIndex: number): Mapping[];
    getMapping(mappingIndex: number): Mapping;
    getMappingInSection(sectionIndex: number, sectionMappingIndex: number): Mapping;
    getMappingsAtGeneratedLine(generatedLine: number): Mapping[];
    getMappingAtGeneratedLocation(generatedLine: number, generatedColumn: number): Mapping;
    getMappingAtGeneratedLocationInSection(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number): Mapping;
    getCandidateMappingsAtSourceLine(sourceIndex: number, sourceLine: number): Mapping[];
    getCandidateMappingsAtSourceLocation(sourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[];
    getCandidateMappingsAtSourceLocationInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[];
    getScopes(topMost?: boolean): Scope[];
    getScopesInSection(sectionIndex: number, topMost?: boolean): Scope[];
    getScope(scopeIndex: number): Scope;
    getScopeInSection(sectionIndex: number, sectionScopeIndex: number): Scope;
    getNarrowestScopeAtGeneratedLocation(generatedLine: number, generatedColumn: number): Scope;
    getNarrowestScopeAtGeneratedLocationInSection(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number): Scope;
    getCandidateNarrowestScopesAtSourceLocation(sourceIndex: number, sourceLine: number, sourceColumn: number): Scope[];
    getCandidateNarrowestScopesAtSourceLocationInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Scope[];
    getLocals(): Local[];
    getLocalsInSection(sectionIndex: number): Local[];
    getLocal(localIndex: number): Local;
    getLocalInSection(sectionIndex: number, sectionLocalIndex: number): Local;
    getLocalAtGeneratedLocationForGeneratedName(generatedLine: number, generatedColumn: number, generatedName: string): Local;
    getLocalAtGeneratedLocationInSectionForGeneratedName(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number, generatedName: string): Local;
    getLocalAtGeneratedLocationForSourceName(generatedLine: number, generatedColumn: number, sourceName: string): Local;
    getLocalAtGeneratedLocationInSectionForSourceName(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number, sourceName: string): Local;
    getCandidateLocalsAtSourceLocationForGeneratedName(sourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local[];
    getCandidateLocalsAtSourceLocationForSourceName(sourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local[];
    getCandidateLocalsAtSourceLocationInSectionForGeneratedName(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local[];
    getCandidateLocalsAtSourceLocationInSectionForSourceName(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local[];
    getMediaTypes(): string[];
    getMediaTypesInSection(sectionIndex: number): string[];
}

export interface ParsedSection {
    sectionIndex: number;
    generatedLine: number;
    generatedColumn: number;
    generatedFile?: string;
}

export interface Mapping {
    mappingIndex: number;
    sectionIndex: number;
    sectionMappingIndex: number;
    generatedLine: number;
    sectionGeneratedLine: number;
    generatedColumnOffset: number;
    generatedColumn: number;
    sectionGeneratedColumn: number;
    sourceIndexOffset?: number;
    source?: Source;
    sourceLineOffset?: number;
    sourceLine?: number;
    sourceColumnOffset?: number;
    sourceColumn?: number;
    nameIndexOffset?: number;
    name?: Name;
}

export interface Source {
    sourceIndex: number;
    sectionIndex: number;
    sectionSourceIndex: number;
    url: string;
    mediaType?: string;
}

export interface Name {
    nameIndex: number;
    sectionIndex: number;
    sectionNameIndex: number;
    text: string;
}

export interface Scope {
    scopeIndex: number;
    sectionIndex: number;
    sectionScopeIndex: number;
    parent: Scope;
    startLine: number;
    startColumn: number;
    sectionStartLine: number;
    sectionStartColumn: number;
    endLine: number;
    endColumn: number;
    sectionEndLine: number;
    sectionEndColumn: number;
    nested: Scope[];
    locals: Local[];
}

export interface Local {
    localIndex: number;
    sectionIndex: number;
    sectionLocalIndex: number;
    scope: Scope;
    generatedName: Name;
    sourceName?: Name;
    isHidden: boolean;
    isRenamed: boolean;
}

enum CharacterCode {
    Comma = 44,
    Semicolon = 59,
    LessThan = 60,
    GreaterThan = 62
}

export function decode(mapFile: string): ParsedSourceMap {
    var mapRoot = utils.absolute(path.dirname(mapFile));
    var generatedFileContent: string;
    var sections: ParsedSection[] = [];
    var sectionMaps: SourceMap[] = [];
    var sectionMapsGeneratedFileContent: string[] = [];
    var sectionMapsContent: string[] = [];
    var sectionNameOffsets: number[] = [];
    var sectionSourceOffsets: number[] = [];
    var sectionMappingOffsets: number[] = [];
    var sectionScopeOffsets: number[] = [];
    var sectionLocalOffsets: number[] = [];
    var sources: Source[] = [];
    var sourcesContent: string[] = [];
    var names: Name[] = [];
    var mappings: Mapping[] = [];
    var generatedMappingCache: Mapping[][] = [];
    var sourceMappingCache: Mapping[][][] = [];
    var sectionGeneratedMappingCache: Mapping[][][] = [];
    var scopes: Scope[] = [];
    var locals: Local[] = [];
    var lastSectionNameOffset = 0;
    var lastSectionSourceOffset = 0;
    var lastSectionMappingOffset = 0;
    var lastSectionScopeOffset = 0;
    var lastSectionLocalOffset = 0;
    var mapContent = utils.readFile(mapFile);
    var map = JSON.parse(mapContent);
    var version: number;
    var generatedFile: string;

    if ("sections" in map) {
        decodeIndexMap(<IndexMap>map);
    } else {
        decodeSourceMap(<SourceMap>map);
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

    function decodeIndexMap(indexMap: IndexMap): void {
        version = indexMap.version;
        generatedFile = utils.resolve(mapRoot, indexMap.file);
        for (var sectionIndex = 0; sectionIndex < indexMap.sections.length; sectionIndex++) {
            var section = indexMap.sections[sectionIndex];
            var sectionFile: string;
            var sectionMapContent: string;
            var sectionMap: SourceMap;
            if (section.map) {
                sectionMap = section.map;
                sectionMapContent = JSON.stringify(map, undefined, "  ");
                sectionFile = utils.resolve(mapRoot, sectionMap.file);
            }
            else if (section.url) {
                var url = utils.resolve(mapRoot, section.url);
                try {
                    sectionMapContent = utils.readFile(url);
                    sectionMap = <SourceMap>JSON.parse(sectionMapContent);
                    sectionFile = utils.resolve(mapRoot, sectionMap.file);
                } catch (e) {
                    sectionMapContent = "";
                }
            }

            var parsedSection: ParsedSection = {
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

    function decodeSourceMap(sourceMap: SourceMap): void {
        version = sourceMap.version;
        generatedFile = utils.resolve(mapRoot, sourceMap.file);
        var parsedSection: ParsedSection = {
            sectionIndex: 0,
            generatedLine: 0,
            generatedColumn: 0,
            generatedFile: generatedFile
        };

        decodeSection(parsedSection, sourceMap, mapContent);
    }

    function decodeSection(section: ParsedSection, sourceMap: SourceMap, mapContent: string): void {
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

    function decodeSectionSources(section: ParsedSection, sourceMap: SourceMap): void {
        lastSectionSourceOffset += sourceMap.sources.length;
    }

    function decodeSectionNames(section: ParsedSection, sourceMap: SourceMap): void {
        if (sourceMap.names) {
            lastSectionNameOffset += sourceMap.names.length;
        }
    }

    function decodeSectionMappings(section: ParsedSection, sourceMap: SourceMap): void {
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
            if (ch === CharacterCode.Semicolon || ch === CharacterCode.Comma || isNaN(ch)) {
                if (pos > startPos) {
                    var segment = vlq.decodeChars(sourceMap.mappings, startPos, pos);
                    var generatedColumnOffset = segment[0];
                    generatedColumn += generatedColumnOffset;
                    sectionGeneratedColumn += generatedColumnOffset;
                    var mapping: Mapping = {
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

            if (ch === CharacterCode.Semicolon) {
                generatedColumn = 0;
                generatedLine++;
                sectionGeneratedColumn = 0;
                sectionGeneratedLine++;
            }
        }

        if (sourceMap.names) {
            lastSectionNameOffset += sourceMap.names.length;
        }

        lastSectionSourceOffset += sourceMap.sources.length;
    }

    function decodeSectionScopes(section: ParsedSection, sourceMap: SourceMap): void {
        var scopesData = sourceMap.x_ms_scopes;
        if (!scopesData) return;

        var sectionScopeIndex: number = 0;
        var scopeIndex: number = 0;
        var line = section.generatedLine;
        var column = section.generatedColumn;
        var sectionLine: number = 0;
        var sectionColumn: number = 0;
        var parent: Scope;
        var current: Scope;
        var startPos = 0;
        for (var pos = 0; pos < scopesData.length; pos++) {
            var ch = scopesData.charCodeAt(pos);
            if (ch === CharacterCode.GreaterThan || ch === CharacterCode.LessThan) {
                if (pos > startPos) {
                    var segment = vlq.decodeChars(scopesData, startPos, pos);
                    var lineOffset = segment[0];
                    var columnOffset = segment[1];
                    line += lineOffset;
                    column += columnOffset;
                    sectionLine += lineOffset;
                    sectionColumn += columnOffset;
                    if (ch === CharacterCode.GreaterThan) {
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
                    else if (ch === CharacterCode.LessThan) {
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

    function decodeSectionLocals(section: ParsedSection, sourceMap: SourceMap): void {
        var localsData = sourceMap.x_ms_locals;
        if (!localsData) return;

        var sectionScopeIndexOffset = sectionScopeOffsets[section.sectionIndex];
        var sectionNameIndexOffset = sectionNameOffsets[section.sectionIndex];
        var sectionScopeIndex = 0;
        var sectionNameIndex = 0;
        var sectionLocalIndex = 0;
        var names = sourceMap.names;

        var startPos = 0;
        for (var pos = 0; pos <= localsData.length; pos++) {
            var ch = localsData.charCodeAt(pos);
            if (ch === CharacterCode.Semicolon || ch === CharacterCode.Comma || isNaN(ch)) {
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
                    var local: Local = {
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

                if (ch === CharacterCode.Semicolon) {
                    sectionScopeIndex++;
                }
            }
        }
    }

    function decodeSectionMediaTypes(section: ParsedSection, sourceMap: SourceMap): void {
        var mediaTypesData = sourceMap.x_ms_mediaTypes;
        if (!mediaTypesData) return;

        var mediaTypeIndex = 0;
        var sourcesMediaTypeData = sourceMap.x_ms_sourceMediaTypes;
        var offsets: number[];
        if (sourcesMediaTypeData) {
            offsets = vlq.decodeChars(sourcesMediaTypeData, 0, sourcesMediaTypeData.length);
        }

        for (var sectionSourceIndex = 0; sectionSourceIndex < sourceMap.sources.length; sectionSourceIndex++) {
            if (offsets && sectionSourceIndex < offsets.length) {
                mediaTypeIndex += offsets[sectionSourceIndex];
            }
            
            var mediaType: string;
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

    function getIndexMap(): IndexMap {
        if ("sections" in map) {
            return <IndexMap>map;
        }
    }

    function getIndexMapContent(): string {
        if ("sections" in map) {
            return mapContent;
        }
    }

    function getSourceMaps(): SourceMap[] {
        return sectionMaps.slice();
    }

    function getSourceMap(sectionIndex: number): SourceMap {
        return sectionMaps[sectionIndex];
    }

    function getSourceMapContent(sectionIndex: number): string {
        return sectionMapsContent[sectionIndex];
    }

    function getGeneratedFileContent(): string {
        if (typeof generatedFileContent !== "string") {
            generatedFileContent = utils.readFile(generatedFile);
        }

        return generatedFileContent;
    }

    function getSourceMapGeneratedFileContent(sectionIndex: number): string {
        if (sectionIndex in sectionMapsGeneratedFileContent) {
            return sectionMapsGeneratedFileContent[sectionIndex];
        }

        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap === map) {
            return getGeneratedFileContent();
        }
        else if (sourceMap) {
            var url = utils.resolve(mapRoot, sourceMap.file);
            var content: string;
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

    function getSections(): ParsedSection[] {
        return sections.slice();
    }

    function getSection(sectionIndex: number): ParsedSection {
        return sections[sectionIndex];
    }

    function getSectionForName(nameIndex: number): ParsedSection {
        var parsedSection: ParsedSection;
        for (var sectionIndex = 0; sectionIndex < sectionNameOffsets.length; sectionIndex++) {
            if (sectionNameOffsets[sectionIndex] < nameIndex) {
                parsedSection = sections[sectionIndex];
            } else {
                return parsedSection;
            }
        }
    }

    function getNames(): Name[] {
        var result: Name[] = [];
        for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            result = result.concat(getNamesInSection(sectionIndex));
        }

        return result;
    }

    function getNamesInSection(sectionIndex: number): Name[] {
        var result: Name[] = [];
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.names) {
            for (var sectionNameIndex = 0; sectionNameIndex < sourceMap.names.length; sectionNameIndex++) {
                result.push(getNameInSection(sectionIndex, sectionNameIndex));
            }
        }

        return result;
    }

    function getName(nameIndex: number): Name {
        if (nameIndex in names) {
            return names[nameIndex];
        }

        var parsedSection = getSectionForName(nameIndex);
        if (parsedSection) {
            var sectionNameIndex = nameIndex - sectionNameOffsets[parsedSection.sectionIndex];
            return getNameInSection(parsedSection.sectionIndex, sectionNameIndex);
        }
    }

    function getNameInSection(sectionIndex: number, sectionNameIndex: number): Name {
        var nameIndex = sectionNameOffsets[sectionIndex] + sectionNameIndex;
        if (nameIndex in names) {
            return names[nameIndex];
        }

        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.names && sectionNameIndex < sourceMap.names.length) {
            var name: Name = {
                nameIndex: nameIndex,
                sectionIndex: sectionIndex,
                sectionNameIndex: sectionNameIndex,
                text: sourceMap.names[sectionNameIndex]
            };
            names[nameIndex] = name;
            return name;
        }
    }

    function getSectionForSource(sourceIndex: number): ParsedSection {
        var parsedSection = sections[0];
        for (var sectionIndex = 0; sectionIndex < sectionSourceOffsets.length; sectionIndex++) {
            if (sectionSourceOffsets[sectionIndex] < sourceIndex) {
                parsedSection = sections[sectionIndex];
            } else {
                return parsedSection;
            }
        }
    }

    function getSources(): Source[] {
        var result: Source[] = [];
        for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
            result = result.concat(getSourcesInSection(sectionIndex));
        }
        return result;
    }

    function getSourcesInSection(sectionIndex: number): Source[] {
        var result: Source[] = [];
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.sources) {
            for (var sectionSourceIndex = 0; sectionSourceIndex < sourceMap.sources.length; sectionSourceIndex++) {
                result.push(getSourceInSection(sectionIndex, sectionSourceIndex));
            }
        }
        return result;
    }

    function getSource(sourceIndex: number): Source {
        if (sourceIndex in sources) {
            return sources[sourceIndex];
        }

        var parsedSection = getSectionForSource(sourceIndex);
        if (parsedSection) {
            var sectionSourceIndex = sourceIndex - sectionSourceOffsets[parsedSection.sectionIndex];
            return getSourceInSection(parsedSection.sectionIndex, sectionSourceIndex);
        }
    }

    function getSourceInSection(sectionIndex: number, sectionSourceIndex: number): Source {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        if (sourceIndex in sources) {
            return sources[sourceIndex];
        }

        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.sources && sectionSourceIndex < sourceMap.sources.length) {
            var url = sourceMap.sources[sectionSourceIndex];
            if (sourceMap.sourceRoot) {
                url = utils.resolve(sourceMap.sourceRoot, url);
            }

            url = utils.resolve(mapRoot, url);
            var source: Source = {
                sourceIndex: sourceIndex,
                sectionIndex: sectionIndex,
                sectionSourceIndex: sectionSourceIndex,
                url: url
            };

            sources[sourceIndex] = source;
            return source;
        }
    }

    function getSourceContent(sourceIndex: number): string {
        if (sourceIndex in sourcesContent) {
            return sourcesContent[sourceIndex];
        }

        var parsedSection = getSectionForSource(sourceIndex);
        if (parsedSection) {
            var sectionSourceIndex = sourceIndex - sectionSourceOffsets[parsedSection.sectionIndex];
            return getSourceContentInSection(parsedSection.sectionIndex, sectionSourceIndex);
        }
    }

    function getSourceContentInSection(sectionIndex: number, sectionSourceIndex: number): string {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        if (sourceIndex in sourcesContent) {
            return sourcesContent[sourceIndex];
        }

        var sourceMap = sectionMaps[sectionIndex];
        if (sourceMap && sourceMap.sources && sectionSourceIndex < sourceMap.sources.length) {
            var sourceContent: string;
            if (sourceMap.sourcesContent && sourceIndex < sourceMap.sourcesContent.length) {
                sourceContent = sourceMap.sourcesContent[sourceIndex];
                sourcesContent[sourceIndex] = sourceContent;
            } else {
                var source = getSourceInSection(sectionIndex, sectionSourceIndex);
                if (source) {
                    try {
                        sourceContent = utils.readFile(source.url);
                    } catch (e) {
                        sourceContent = "";
                    }
                }
            }

            sourcesContent[sourceIndex] = sourceContent;
            return sourceContent;
        }
    }

    function getMappings(): Mapping[] {
        return mappings.slice(0);
    }

    function getMappingsInSection(sectionIndex: number): Mapping[] {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionMappingOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionMappingOffsets[sectionIndex + 1] : lastSectionMappingOffset;
            return mappings.slice(start, end);
        }

        return [];
    }

    function getMapping(mappingIndex: number): Mapping {
        return mappings[mappingIndex];
    }

    function getMappingInSection(sectionIndex: number, sectionMappingIndex: number): Mapping {
        var mappingIndex = sectionMappingOffsets[sectionIndex] + sectionMappingIndex;
        return getMapping(mappingIndex);
    }

    function getMappingsAtGeneratedLine(generatedLine: number): Mapping[] {
        var generatedLineCache = generatedMappingCache[generatedLine];
        if (generatedLineCache) {
            var result = generatedLineCache.slice();
            return result;
        }

        return [];
    }

    function getMappingAtGeneratedLocation(generatedLine: number, generatedColumn: number): Mapping {
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

    function getMappingAtGeneratedLocationInSection(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number): Mapping {
        var sectionGeneratedLocationCache = sectionGeneratedMappingCache[sectionIndex];
        if (sectionGeneratedLocationCache) {
            var sectionGeneratedLineCache = sectionGeneratedLocationCache[sectionGeneratedLine];
            if (sectionGeneratedLineCache) {
                return sectionGeneratedLineCache[sectionGeneratedColumn];
            }
        }
    }

    function getCandidateMappingsAtSourceLine(sourceIndex: number, sourceLine: number): Mapping[] {
        var sourceCache = sourceMappingCache[sourceIndex];
        if (sourceCache) {
            var sourceLineCache = sourceCache[sourceLine];
            if (sourceLineCache) {
                var result = sourceLineCache.slice();
                result.sort((x, y) => (x.sourceLine - y.sourceLine) || (x.sourceColumn - y.sourceColumn));
                return result;
            }
        }

        return [];
    }

    function getCandidateMappingsAtSourceLocation(sourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[] {
        var mappings = getCandidateMappingsAtSourceLine(sourceIndex, sourceLine);
        var candidates = mappings.filter(mapping => mapping.sourceColumn === sourceColumn);
        return candidates;
    }

    function getCandidateMappingsAtSourceLocationInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[] {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionSourceIndex;
        return getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
    }

    function getScopes(topMost?: boolean): Scope[] {
        if (topMost) {
            return scopes.filter(scope => !!scope.parent);
        }

        return scopes.slice();
    }

    function getScopesInSection(sectionIndex: number, topMost?: boolean): Scope[] {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionScopeOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionScopeOffsets[sectionIndex + 1] : lastSectionScopeOffset;
            var result = scopes.slice(start, end);
            if (topMost) {
                result = result.filter(scope => !!scope.parent);
            }

            return result;
        }

        return [];
    }

    function getScope(scopeIndex: number): Scope {
        return scopes[scopeIndex];
    }

    function getScopeInSection(sectionIndex: number, sectionScopeIndex: number): Scope {
        var scopeIndex = sectionScopeOffsets[sectionIndex] + sectionScopeIndex;
        return getScope(scopeIndex);
    }

    function getNarrowestScopeAtGeneratedLocation(generatedLine: number, generatedColumn: number): Scope {
        var narrowestScope: Scope;
        for (var scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            var scope = scopes[scopeIndex];
            if (compareOffsets(scope.startLine, scope.startColumn, generatedLine, generatedColumn) > 0) {
                continue;
            }
            else if (compareOffsets(scope.endLine, scope.endColumn, generatedLine, generatedColumn) < 0) {
                continue;
            }

            if (!narrowestScope ||
                compareOffsets(narrowestScope.startLine, narrowestScope.startColumn, scope.startLine, scope.startColumn) < 0 ||
                compareOffsets(narrowestScope.endLine, narrowestScope.endColumn, scope.endLine, scope.endColumn) < 0) {
                narrowestScope = scope;
            }
        }

        return narrowestScope;
    }

    function getNarrowestScopeAtGeneratedLocationInSection(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number): Scope {
        var scopes = getScopesInSection(sectionIndex);
        var narrowestScope: Scope;
        for (var scopeIndex = 0; scopeIndex < scopes.length; scopeIndex++) {
            var scope = scopes[scopeIndex];
            if (compareOffsets(scope.sectionStartLine, scope.sectionStartColumn, sectionGeneratedLine, sectionGeneratedColumn) > 0) {
                continue;
            }
            else if (compareOffsets(scope.sectionEndLine, scope.sectionEndColumn, sectionGeneratedLine, sectionGeneratedColumn) < 0) {
                continue;
            }

            if (!narrowestScope ||
                compareOffsets(narrowestScope.startLine, narrowestScope.startColumn, scope.startLine, scope.startColumn) < 0 ||
                compareOffsets(narrowestScope.endLine, narrowestScope.endColumn, scope.endLine, scope.endColumn) < 0) {
                narrowestScope = scope;
            }
        }

        return narrowestScope;
    }

    function getCandidateNarrowestScopesAtSourceLocation(sourceIndex: number, sourceLine: number, sourceColumn: number): Scope[] {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen: boolean[] = [];
        var result: Scope[] = [];
        mappings.forEach(mapping => {
            var scope = getNarrowestScopeAtGeneratedLocation(mapping.generatedLine, mapping.generatedColumn);
            if (!seen[scope.scopeIndex]) {
                seen[scope.scopeIndex] = true;
                result.push(scope);
            }
        });
        return result;
    }

    function getCandidateNarrowestScopesAtSourceLocationInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Scope[] {
        var sourceIndex = sectionSourceOffsets[sectionIndex] + sectionIndex;
        return getCandidateNarrowestScopesAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
    }

    function getLocals(): Local[] {
        return locals.slice();
    }

    function getLocalsInSection(sectionIndex: number): Local[] {
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
            var start = sectionLocalOffsets[sectionIndex];
            var end = sectionIndex + 1 < sections.length ? sectionLocalOffsets[sectionIndex + 1] : lastSectionLocalOffset;
            return locals.slice(start, end);
        }

        return [];
    }

    function getLocal(localIndex: number): Local {
        return locals[localIndex];
    }

    function getLocalInSection(sectionIndex: number, sectionLocalIndex: number): Local {
        var localIndex = sectionLocalOffsets[sectionIndex] + sectionLocalIndex;
        return getLocal(localIndex);
    }

    function getLocalAtGeneratedLocationForGeneratedName(generatedLine: number, generatedColumn: number, generatedName: string): Local {
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

    function getLocalAtGeneratedLocationInSectionForGeneratedName(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number, generatedName: string): Local {
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

    function getLocalAtGeneratedLocationForSourceName(generatedLine: number, generatedColumn: number, sourceName: string): Local {
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

    function getLocalAtGeneratedLocationInSectionForSourceName(sectionIndex: number, sectionGeneratedLine: number, sectionGeneratedColumn: number, sourceName: string): Local {
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

    function getCandidateLocalsAtSourceLocationForGeneratedName(sourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local[] {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen: boolean[] = [];
        var result: Local[] = [];
        mappings.forEach(mapping => {
            var local = getLocalAtGeneratedLocationForGeneratedName(mapping.generatedLine, mapping.generatedColumn, generatedName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }

    function getCandidateLocalsAtSourceLocationInSectionForGeneratedName(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local[] {
        var mappings = getCandidateMappingsAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn);
        var seen: boolean[] = [];
        var result: Local[] = [];
        mappings.forEach(mapping => {
            var local = getLocalAtGeneratedLocationForGeneratedName(mapping.generatedLine, mapping.generatedColumn, generatedName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }

    function getCandidateLocalsAtSourceLocationForSourceName(sourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local[] {
        var mappings = getCandidateMappingsAtSourceLocation(sourceIndex, sourceLine, sourceColumn);
        var seen: boolean[] = [];
        var result: Local[] = [];
        mappings.forEach(mapping => {
            var local = getLocalAtGeneratedLocationForSourceName(mapping.generatedLine, mapping.generatedColumn, sourceName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }

    function getCandidateLocalsAtSourceLocationInSectionForSourceName(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local[] {
        var mappings = getCandidateMappingsAtSourceLocationInSection(sectionIndex, sectionSourceIndex, sourceLine, sourceColumn);
        var seen: boolean[] = [];
        var result: Local[] = [];
        mappings.forEach(mapping => {
            var local = getLocalAtGeneratedLocationForSourceName(mapping.generatedLine, mapping.generatedColumn, sourceName);
            if (!seen[local.localIndex]) {
                seen[local.localIndex] = true;
                result.push(local);
            }
        });
        return result;
    }

    function getMediaTypes(): string[] {
        var result: string[] = [];
        for (var sectionIndex = 0; sectionIndex <= sections.length; sectionIndex++) {
            result = result.concat(getMediaTypesInSection(sectionIndex));
        }

        return result;
    }

    function getMediaTypesInSection(sectionIndex: number): string[] {
        var sourceMap = getSourceMap(sectionIndex);
        if (sourceMap && sourceMap.x_ms_mediaTypes) {
            return sourceMap.x_ms_mediaTypes.slice();
        }

        return [];
    }

    function compareOffsets(line1: number, column1: number, line2: number, column2: number): number {
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