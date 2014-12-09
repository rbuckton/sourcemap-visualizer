/// <reference path="node.d.ts" />
import path = require('path');
import utils = require('./utils');
import vlq = require('./vlq');

interface IndexMap {
    version: number;
    file: string;
    sections: Section[];
}

interface Section {
    offset: {
        line: number;
        column: number;
    };
    url?: string;
    map?: SourceMap;
}

interface SourceMap {
    version: number;
    file: string;
    sourceRoot: string;
    sources: string[];
    names: string[];
    mappings: string;
    sourcesContent?: string[];
    x_ms_scopes?: string;
    x_ms_locals?: string;
    x_ms_mediaTypes?: string;
    x_ms_sourceMediaTypes?: number[];
}

export interface ParsedSourceMap {
    generatedFile: string;
    isIndexMap: boolean;
    getIndexMap(): IndexMap;
    getSourceMaps(): SourceMap[];
    getSourceMapForSection(sectionIndex: number): SourceMap;
    getGeneratedFileContent(): string;
    getSections(): ParsedSection[];
    getSection(sectionIndex: number): ParsedSection;
    getNames(): Name[];
    getNamesInSection(sectionIndex: number): Name[];
    getName(nameIndex: number): Name;
    getNameInSection(sectionIndex: number, sectionNameIndex: number): Name;
    getSource(sourceIndex: number): Source;
    getSourceInSection(sectionIndex: number, sectionSourceIndex: number): Source;
    getSourceContent(sourceIndex: number): string;
    getSourceContentInSection(sectionIndex: number, sectionSourceIndex: number): string;
    getSourceMediaType(sourceIndex: number, fallbackMediaType?: string): string;
    getSourceMediaTypeInSection(sectionIndex: number, sectionSourceIndex: number, fallbackMediaType?: string): string;
    getMappingInGenerated(generatedLine: number, generatedColumn: number): Mapping;
    getMappingsInSource(sourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[];
    getMappingsInSourceInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[];
    getScopes(): Scope[];
    getScopesInSection(sectionIndex: number): Scope[];
    getScope(scopeIndex: number): Scope;
    getScopeInSection(sectionIndex: number, sectionScopeIndex: number): Scope;
    getScopeInGenerated(generatedLine: number, generatedColumn: number): Scope;
    getScopeInSource(sourceIndex: number, sourceLine: number, sourceColumn: number): Scope;
    getScopeInSourceInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Scope;
    getContainingScopesInGenerated(generatedLine: number, generatedColumn: number): Scope[];
    getContainingScopesInSource(sourceIndex: number, sourceLine: number, sourceColumn: number): Scope[];
    getContainingScopesInSourceInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Scope[];
    getContainingScopesForScope(scopeIndex: number): Scope[];
    getContainingScopesForScopeInSection(sectionIndex: number, sectionScopeIndex: number): Scope[];
    getLocals(): Local[];
    getLocalsInSection(sectionIndex: number): Local[];
    getLocalsInScope(scopeIndex: number): Local[];
    getLocalsInScopeInSection(sectionIndex: number, sectionScopeIndex: number): Local[];
    getLocalsInGenerated(generatedLine: number, generatedColumn: number): Local[];
    getLocalsInSource(sourceIndex: number, sourceLine: number, sourceColumn: number): Local[];
    getLocalsInSourceInSection(sectionIndex: number, sectionSourceIndex: number, sourceLine: number, sourceColumn: number): Local[];
    getLocal(localIndex: number): Local;
    getLocalInSection(sectionIndex: number, sectionLocalIndex: number): Local;
    getLocalInGeneratedForGeneratedName(generatedLine: number, generatedColumn: number, generatedName: string): Local;
    getLocalInGeneratedForSourceName(generatedLine: number, generatedColumn: number, sourceName: string): Local;
    getLocalInSourceFromGeneratedName(sourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local;
    getLocalInSourceFromSourceName(sourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local;
    getLocalInSourceInSectionFromGeneratedName(sourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local;
    getLocalInSourceInSectionFromSourceName(sourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local;
    getMediaTypes(): string[];
    getMediaTypesInSection(sectionIndex: number): string[];
    encodeMapping(mapping: Mapping);
    encodeScope(scope: Scope);
    encodeLocal(local: Local);
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
    generatedColumnOffset: number;
    generatedColumn: number;
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
    endLine: number;
    endColumn: number;
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
    var sectionNameOffsets: number[] = [];
    var sectionSourceOffsets: number[] = [];
    var sectionMappingOffsets: number[] = [];
    var sectionScopeOffsets: number[] = [];
    var sectionLocalOffsets: number[] = [];
    var sectionMapsContent: string[] = [];
    var sectionMaps: SourceMap[] = [];
    var sources: Source[] = [];
    var sourcesContent: string[] = [];
    var names: Name[] = [];
    var mappings: Mapping[] = [];
    var generatedMappingCache: Mapping[][] = [];
    var sourceMappingCache: Mapping[][][][] = [];
    var scopes: Scope[] = [];
    var locals: Local[] = [];
    var lastSectionNameOffset = 0;
    var lastSectionSourceOffset = 0;
    var lastSectionMappingOffset = 0;
    var lastSectionScopeOffset = 0;
    var lastSectionLocalOffset = 0;

    var mapContent = utils.readFile(mapFile);
    var map = JSON.parse(mapContent);
    var version = map.version;
    var generatedFile = utils.resolve(mapRoot, map.file);

    if ("sections" in map) {
        decodeIndexMap(<IndexMap>map);
    } else {
        decodeSourceMap(<SourceMap>map);
    }

    return {
        generatedFile: generatedFile,
        getSections: getSections,
        getSection: getSection,
        getSourceContent: getSourceContent,
        getGeneratedMapping: getGeneratedMapping,
        getSourceMappings: getSourceMappings,
        getScopes: getScopes,
        getScope: getScope,
        getGeneratedScope: getGeneratedScope,
        getGeneratedLocals: getGeneratedLocals,
        getGeneratedLocalFromGeneratedName: getGeneratedLocalFromGeneratedName,
        getGeneratedLocalFromSourceName: getGeneratedLocalFromSourceName,
        getSourceScope: getSourceScope,
        getSourceLocals: getSourceLocals,
        getSourceLocalFromGeneratedName: getSourceLocalFromGeneratedName,
        getSourceLocalFromSourceName: getSourceLocalFromSourceName
    };

    function decodeIndexMap(indexMap: IndexMap): void {
        version = indexMap.version;
        generatedFile = indexMap.file;
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
        generatedFile = sourceMap.file;
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
                    sectionMappingIndex++;
                    var generatedColumnOffset = segment[0];
                    generatedColumn += generatedColumnOffset;
                    var mapping: Mapping = {
                        mappingIndex: sectionMappingOffset + sectionMappingIndex,
                        sectionIndex: section.sectionIndex,
                        sectionMappingIndex: sectionMappingIndex,
                        generatedLine: generatedLine,
                        generatedColumnOffset: generatedColumnOffset,
                        generatedColumn: generatedColumn
                    };

                    var generatedLineCache = generatedMappingCache[generatedLine] || (generatedMappingCache[generatedLine] = []);
                    generatedLineCache[generatedColumn] = mapping;

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
                        var sourceColumnCache = sourceLineCache[sourceColumn] || (sourceLineCache[sourceColumn] = []);
                        sourceColumnCache.push(mapping);
                    }

                    mappings[mapping.mappingIndex] = mapping;
                }

                startPos = pos + 1;
            }

            if (ch === CharacterCode.Semicolon) {
                generatedColumn = 0;
                generatedLine++;
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
        var line: number = 0;
        var column: number = 0;
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
                            endLine: undefined,
                            endColumn: undefined,
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

    function getGeneratedFileContent(): string {
        if (typeof generatedFileContent !== "string") {
            generatedFileContent = utils.readFile(generatedFile);
        }

        return generatedFileContent;
    }

    function getSections(): ParsedSection[]{
        return sections;
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
        var parsedSection: ParsedSection;
        for (var sectionIndex = 0; sectionIndex < sectionSourceOffsets.length; sectionIndex++) {
            if (sectionSourceOffsets[sectionIndex] < sourceIndex) {
                parsedSection = sections[sectionIndex];
            } else {
                return parsedSection;
            }
        }
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

    function getGeneratedMapping(generatedLine: number, generatedColumn: number): Mapping {
        var generatedLineCache = generatedMappingCache[generatedLine];
        if (generatedLineCache) {
            return generatedLineCache[generatedColumn];
        }
    }

    function getSourceMappings(sourceIndex: number, sourceLine: number, sourceColumn: number): Mapping[] {
        var sourceCache = sourceMappingCache[sourceIndex];
        if (sourceCache) {
            var sourceLineCache = sourceCache[sourceLine];
            if (sourceLineCache) {
                return sourceLineCache[sourceColumn];
            }
        }

        return [];
    }

    function getScopes(): Scope[] {
        return scopes;
    }

    function getScope(scopeIndex: number): Scope {
        return scopes[scopeIndex];
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

    function getGeneratedScope(generatedLine: number, generatedColumn: number): Scope {
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

    function getGeneratedLocals(generatedLine: number, generatedColumn: number): Local[] {
        var scope = getGeneratedScope(generatedLine, generatedColumn);
        if (scope) {
            return scope.locals;
        }
    }

    function getGeneratedLocalFromGeneratedName(generatedLine: number, generatedColumn: number, generatedName: string): Local {
        var scope = getGeneratedScope(generatedLine, generatedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.generatedName.text === generatedName) {
                    return local;
                }
            }
        }
    }

    function getGeneratedLocalFromSourceName(generatedLine: number, generatedColumn: number, sourceName: string): Local {
        var scope = getGeneratedScope(generatedLine, generatedColumn);
        if (scope) {
            for (var i = 0; i < scope.locals.length; i++) {
                var local = scope.locals[i];
                if (local.sourceName && local.sourceName.text === sourceName) {
                    return local;
                }
            }
        }
    }

    function getSourceScope(sourceIndex: number, sourceLine: number, sourceColumn: number): Scope {
        var mapping = getSourceMappings(sourceIndex, sourceLine, sourceColumn)[0];
        if (mapping) {
            return getGeneratedScope(mapping.generatedLine, mapping.generatedColumn);
        }
    }

    function getSourceLocals(sourceIndex: number, sourceLine: number, sourceColumn: number): Local[] {
        var scope = getSourceScope(sourceIndex, sourceLine, sourceColumn);
        if (scope) {
            return scope.locals;
        }
    }

    function getSourceLocalFromGeneratedName(sourceIndex: number, sourceLine: number, sourceColumn: number, generatedName: string): Local {
        var mapping = getSourceMappings(sourceIndex, sourceLine, sourceColumn)[0];
        if (mapping) {
            return getGeneratedLocalFromGeneratedName(mapping.generatedLine, mapping.generatedColumn, generatedName);
        }
    }

    function getSourceLocalFromSourceName(sourceIndex: number, sourceLine: number, sourceColumn: number, sourceName: string): Local {
        var mapping = getSourceMappings(sourceIndex, sourceLine, sourceColumn)[0];
        if (mapping) {
            return getGeneratedLocalFromSourceName(mapping.generatedLine, mapping.generatedColumn, sourceName);
        }
    }
}