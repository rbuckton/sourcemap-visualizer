var sources = document.querySelectorAll("div.source");
var sourceMappings = document.querySelectorAll("div.source span.mapping");
var generatedMappings = document.querySelectorAll("div.generated span.mapping");
var mapMappings = document.querySelectorAll("div.map span.mapping");
var rawmapMappings = document.querySelectorAll("div.rawmap span.mapping");
var sourcepicker = document.querySelector("#source");
var sourceBox = document.querySelector(".source-box");
var generatedBox = document.querySelector(".generated-box");
var mapBox = document.querySelector(".map-box");
var rawmapBox = document.querySelector(".rawmap-box");
var sourceFileMap = new Map();
for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    sourceFileMap.set(source.getAttribute("data-source"), source);
}
var sourceMappingIdMap = new Map();
for (var i = 0; i < sourceMappings.length; i++) {
    var sourceMapping = sourceMappings[i];
    var mappingIds = sourceMapping.getAttribute("data-mapping").split(" ");
    mappingIds.forEach(function (mappingId) {
        sourceMappingIdMap.set(mappingId, sourceMapping);
    });
}
var generatedMappingIdMap = new Map();
for (var i = 0; i < generatedMappings.length; i++) {
    var generatedMapping = generatedMappings[i];
    generatedMappingIdMap.set(generatedMapping.getAttribute("data-mapping"), generatedMapping);
}
var mapMappingIdMap = new Map();
for (var i = 0; i < mapMappings.length; i++) {
    var mapMapping = mapMappings[i];
    mapMappingIdMap.set(mapMapping.getAttribute("data-mapping"), mapMapping);
}
var rawmapMappingIdMap = new Map();
for (var i = 0; i < rawmapMappings.length; i++) {
    var rawmapMapping = rawmapMappings[i];
    rawmapMappingIdMap.set(rawmapMapping.getAttribute("data-mapping"), rawmapMapping);
}
var lineMappingMap = new Map();
for (var i = 0; i < lineMappings.length; i++) {
    lineMappingMap.set(String(lineMappings[i].mappingIndex), lineMappings[i]);
}
if (sourcepicker) {
    sourcepicker.addEventListener("change", function (e) {
        setSource(sourcepicker.value);
    });
}
function forEachAncestor(element, callback) {
    for (var ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        var result = callback(ancestor);
        if (result) {
            return result;
        }
    }
}
function forEachChild(element, callback) {
    for (var child = element.firstElementChild; child; child = child.nextElementSibling) {
        var result = callback(child);
        if (result) {
            return result;
        }
    }
}
var currentGeneratedMappings;
var currentSourceMappings;
var currentMapMappings;
var currentRawmapMappings;
var currentSource;
document.addEventListener("mouseover", function (e) {
    var element = e.target;
    if (element.classList.contains("mapping")) {
        var container = getContainer(element);
        // get all mappings with the same offsets
        var id = element.getAttribute("data-mapping");
        if (id) {
            var ids = id.split(" ");
        }
        e.stopImmediatePropagation();
        setMappings(ids);
    }
});
document.addEventListener("mouseout", function (e) {
    var element = e.target;
    if (element.classList.contains("mapping")) {
        e.stopImmediatePropagation();
        setMappings();
    }
});
document.addEventListener("click", function (e) {
    var element = e.target;
    if (element.classList.contains("mapping")) {
        e.stopImmediatePropagation();
        // find the parent box
        var box;
        for (var node = element.parentElement; node; node = node.parentElement) {
            if (node.classList.contains("source-box") || node.classList.contains("generated-box") || node.classList.contains("map-box") || node.classList.contains("rawmap-box")) {
                box = node;
                break;
            }
        }
        var id = element.getAttribute("data-mapping");
        if (id) {
            id = id.split(' ')[0];
        }
        scrollToMapping(lineMappingMap.get(id), box, 0);
    }
});
function getContainer(element) {
    for (var node = element.parentElement; node; node = node.parentElement) {
        if (node.classList.contains("source-box") || node.classList.contains("generated-box") || node.classList.contains("map-box") || node.classList.contains("rawmap-box")) {
            return node;
        }
    }
}
var overMapBox = false;
var overGeneratedBox = false;
var overSourceBox = false;
mapBox.addEventListener("mouseover", function (e) {
    overMapBox = true;
});
mapBox.addEventListener("mouseout", function (e) {
    overMapBox = false;
});
mapBox.addEventListener("scroll", function (e) {
    if (!overMapBox)
        return;
    var generatedLineOffset = generatedLineCount * (mapBox.scrollTop / mapBox.scrollHeight);
    var generatedLine = Math.floor(generatedLineOffset);
    var partialOffset = generatedLineOffset - generatedLine;
    var lineMappingsForLine = lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; });
    if (lineMappingsForLine.length) {
        var firstLineMapping = lineMappingsForLine.reduce(function (prev, mapping) { return mapping.generatedColumn < prev.generatedColumn ? mapping : prev; });
        if (firstLineMapping) {
            scrollToMapping(firstLineMapping, mapBox, partialOffset);
        }
    }
});
generatedBox.addEventListener("mouseover", function (e) {
    overGeneratedBox = true;
});
generatedBox.addEventListener("mouseout", function (e) {
    overGeneratedBox = false;
});
generatedBox.addEventListener("scroll", function (e) {
    if (!overGeneratedBox)
        return;
    var generatedLineOffset = generatedLineCount * (generatedBox.scrollTop / generatedBox.scrollHeight);
    var generatedLine = Math.floor(generatedLineOffset);
    var partialOffset = generatedLineOffset - generatedLine;
    var lineMappingsForLine = lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; });
    if (lineMappingsForLine.length) {
        var firstLineMapping = lineMappingsForLine.reduce(function (prev, mapping) { return mapping.generatedColumn < prev.generatedColumn ? mapping : prev; });
        if (firstLineMapping) {
            scrollToMapping(firstLineMapping, generatedBox, partialOffset);
        }
    }
});
sourceBox.addEventListener("mouseover", function (e) {
    overSourceBox = true;
});
sourceBox.addEventListener("mouseout", function (e) {
    overSourceBox = false;
});
sourceBox.addEventListener("scroll", function (e) {
    if (!overSourceBox)
        return;
    var sourceIndex = Number(sourcepicker.value);
    var sourceLineOffset = sourceLineCounts[sourceIndex] * (sourceBox.scrollTop / sourceBox.scrollHeight);
    var sourceLine = Math.floor(sourceLineOffset);
    var partialOffset = sourceLineOffset - sourceLine;
    var lineMappingsForLine = lineMappings.filter(function (mapping) { return mapping.source && mapping.source.sourceIndex === sourceIndex && mapping.sourceLine === sourceLine; });
    if (lineMappingsForLine.length) {
        var firstLineMapping = lineMappingsForLine.reduce(function (prev, mapping) { return mapping.sourceColumn < prev.sourceColumn ? mapping : prev; });
        if (firstLineMapping) {
            scrollToMapping(firstLineMapping, sourceBox, partialOffset);
        }
    }
});
if (sources.length) {
    sources[0].classList.add("selected");
}
function selectMappings(current, requested) {
    if (current) {
        current.forEach(function (currentElement) {
            if (!requested || !requested.has(currentElement)) {
                currentElement.classList.remove("selected");
            }
        });
    }
    if (requested) {
        requested.forEach(function (requestedElement) {
            if (!current || !current.has(requestedElement)) {
                requestedElement.classList.add("selected");
            }
        });
    }
    return requested;
}
function setMappings(mappingIds) {
    if (mappingIds && mappingIds.length) {
        var lineMappings = mappingIds.map(function (mappingId) { return lineMappingMap.get(mappingId); });
        if (lineMappings.length) {
            var generatedMappings = new Set();
            var sourceMappings = new Set();
            var mapMappings = new Set();
            var rawmapMappings = new Set();
            mappingIds.map(function (mappingId) {
                var generatedMapping = generatedMappingIdMap.get(mappingId);
                if (generatedMapping) {
                    generatedMappings.add(generatedMapping);
                }
                var sourceMapping = sourceMappingIdMap.get(mappingId);
                if (sourceMapping) {
                    sourceMappings.add(sourceMapping);
                }
                var mapMapping = mapMappingIdMap.get(mappingId);
                if (mapMapping) {
                    mapMappings.add(mapMapping);
                }
                var rawmapMapping = rawmapMappingIdMap.get(mappingId);
                if (rawmapMapping) {
                    rawmapMappings.add(rawmapMapping);
                }
            });
            var sourceIndex = lineMappings.reduce(function (index, mapping) { return typeof index !== "undefined" ? index : mapping.source && mapping.source.sourceIndex; }, undefined);
            if (typeof sourceIndex !== "undefined") {
                setSource(String(sourceIndex));
            }
        }
    }
    currentGeneratedMappings = selectMappings(currentGeneratedMappings, generatedMappings);
    currentSourceMappings = selectMappings(currentSourceMappings, sourceMappings);
    currentMapMappings = selectMappings(currentMapMappings, mapMappings);
    currentRawmapMappings = selectMappings(currentRawmapMappings, rawmapMappings);
}
function setSource(sourceIndex) {
    var source = sourceFileMap.get(sourceIndex);
    if (source !== currentSource) {
        if (currentSource) {
            currentSource.classList.remove("selected");
        }
        currentSource = source;
        if (currentSource) {
            currentSource.classList.add("selected");
        }
        sourcepicker.value = sourceIndex;
    }
}
function scrollToMapping(lineMapping, target, partialOffset) {
    if (target !== generatedBox) {
        generatedBox.scrollTop = partialOffset + (generatedBox.scrollHeight * (lineMapping.generatedLine / generatedLineCount));
    }
    if (target !== mapBox) {
        mapBox.scrollTop = partialOffset + (mapBox.scrollHeight * (lineMapping.generatedLine / generatedLineCount));
    }
    if (target !== sourceBox && lineMapping.source) {
        setSource(String(lineMapping.source.sourceIndex));
        sourceBox.scrollTop = partialOffset + (sourceBox.scrollHeight * (lineMapping.sourceLine / sourceLineCounts[lineMapping.source.sourceIndex]));
    }
}
