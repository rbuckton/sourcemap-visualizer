interface LineMapping {
  id: number;
  generatedLine: number;
  generatedColumn: number;
  source: string;
  sourceIndex: number;
  sourceLine: number;
  sourceColumn: number;
  scopeName: string;
  scopeNameIndex: number;
}

declare var lineMappings: LineMapping[];
declare var generatedLineCount: number;
declare var sourceLineCounts: number[];

var sources = document.querySelectorAll("div.source");
var sourceMappings = document.querySelectorAll("div.source span.mapping");
var generatedMappings = document.querySelectorAll("div.generated span.mapping");
var mapMappings = document.querySelectorAll("div.map span.mapping");
var rawmapMappings = document.querySelectorAll("div.rawmap span.mapping");
var sourcepicker = <HTMLSelectElement>document.querySelector("#source");
var sourceBox = <HTMLDivElement>document.querySelector(".source-box");
var generatedBox = <HTMLDivElement>document.querySelector(".generated-box");
var mapBox = <HTMLDivElement>document.querySelector(".map-box");
var rawmapBox = <HTMLDivElement>document.querySelector(".rawmap-box");

var sourceFileMap = new Map<string, HTMLElement>();
for (var i = 0; i < sources.length; i++) {
  var source = <HTMLElement>sources[i];
  sourceFileMap.set(source.getAttribute("data-source"), source);
}

var sourceMappingIdMap = new Map<string, HTMLElement>();
for (var i = 0; i < sourceMappings.length; i++) {
  var sourceMapping = <HTMLElement>sourceMappings[i];
  var mappingIds = sourceMapping.getAttribute("data-mapping").split(" ");
  mappingIds.forEach(mappingId => 
  {
    sourceMappingIdMap.set(mappingId, sourceMapping);
  });
}

var generatedMappingIdMap = new Map<string, HTMLElement>();
for (var i = 0; i < generatedMappings.length; i++) {
  var generatedMapping = <HTMLElement>generatedMappings[i];
  generatedMappingIdMap.set(generatedMapping.getAttribute("data-mapping"), generatedMapping);
}

var mapMappingIdMap = new Map<string, HTMLElement>();
for (var i = 0; i < mapMappings.length; i++) {
  var mapMapping = <HTMLElement>mapMappings[i];
  mapMappingIdMap.set(mapMapping.getAttribute("data-mapping"), mapMapping);
}

var rawmapMappingIdMap = new Map<string, HTMLElement>();
for (var i = 0; i < rawmapMappings.length; i++) {
  var rawmapMapping = <HTMLElement>rawmapMappings[i];
  rawmapMappingIdMap.set(rawmapMapping.getAttribute("data-mapping"), rawmapMapping);
}

var lineMappingMap = new Map<string, LineMapping>();
for (var i = 0; i < lineMappings.length; i++) {
  lineMappingMap.set(String(lineMappings[i].id), lineMappings[i]);
}

if (sourcepicker) {
  sourcepicker.addEventListener("change", e => {
    setSource(sourcepicker.value);
  });
}

function forEachAncestor<T>(element: HTMLElement, callback: (element: HTMLElement) => T): T {
  for (var ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    var result = callback(ancestor);
    if (result) {
      return result;
    }
  }
}

function forEachChild<T>(element: HTMLElement, callback: (element: HTMLElement) => T): T {
  for (var child = <HTMLElement>element.firstElementChild; child; child = <HTMLElement>child.nextElementSibling) {
    var result = callback(child);
    if (result) {
      return result;
    }
  }
}

var currentGeneratedMappings: Set<HTMLElement>;
var currentSourceMappings: Set<HTMLElement>;
var currentMapMappings: Set<HTMLElement>;
var currentRawmapMappings: Set<HTMLElement>;
var currentSource: HTMLElement;
document.addEventListener("mouseover", e => {
  var element = <HTMLElement>e.target;
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

document.addEventListener("mouseout", e => {
  var element = <HTMLElement>e.target;
  if (element.classList.contains("mapping")) {
    e.stopImmediatePropagation();
    setMappings();
  }
});

document.addEventListener("click", e => {
  var element = <HTMLElement>e.target;
  if (element.classList.contains("mapping")) {
    e.stopImmediatePropagation();

    // find the parent box
    var box: HTMLElement;
    for (var node = element.parentElement; node; node = node.parentElement) {
      if (node.classList.contains("source-box") ||
          node.classList.contains("generated-box") ||
          node.classList.contains("map-box") ||
          node.classList.contains("rawmap-box")) {
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
})

function getContainer(element: HTMLElement): HTMLElement {
  for (var node = element.parentElement; node; node = node.parentElement) {
    if (node.classList.contains("source-box") ||
        node.classList.contains("generated-box") ||
        node.classList.contains("map-box") ||
        node.classList.contains("rawmap-box")) {
      return node;
    }
  }
}

var overMapBox = false;
var overGeneratedBox = false;
var overSourceBox = false;

mapBox.addEventListener("mouseover", e => { overMapBox = true; });
mapBox.addEventListener("mouseout", e => { overMapBox = false; });
mapBox.addEventListener("scroll", e => {
  if (!overMapBox) return;
  var generatedLineOffset = generatedLineCount * (mapBox.scrollTop / mapBox.scrollHeight);
  var generatedLine = Math.floor(generatedLineOffset);
  var partialOffset = generatedLineOffset - generatedLine;
  var lineMappingsForLine = lineMappings.filter(mapping => mapping.generatedLine === generatedLine);
  if (lineMappingsForLine.length) {
    var firstLineMapping = lineMappingsForLine.reduce((prev, mapping) => mapping.generatedColumn < prev.generatedColumn ? mapping : prev);
    if (firstLineMapping) {
      scrollToMapping(firstLineMapping, mapBox, partialOffset);
    }
  }
});

generatedBox.addEventListener("mouseover", e => { overGeneratedBox = true; });
generatedBox.addEventListener("mouseout", e => { overGeneratedBox = false; });
generatedBox.addEventListener("scroll", e => {
  if (!overGeneratedBox) return;
  var generatedLineOffset = generatedLineCount * (generatedBox.scrollTop / generatedBox.scrollHeight);
  var generatedLine = Math.floor(generatedLineOffset);
  var partialOffset = generatedLineOffset - generatedLine;
  var lineMappingsForLine = lineMappings.filter(mapping => mapping.generatedLine === generatedLine);
  if (lineMappingsForLine.length) {
    var firstLineMapping = lineMappingsForLine.reduce((prev, mapping) => mapping.generatedColumn < prev.generatedColumn ? mapping : prev);
    if (firstLineMapping) {
      scrollToMapping(firstLineMapping, generatedBox, partialOffset);
    }
  }
});

sourceBox.addEventListener("mouseover", e => { overSourceBox = true; });
sourceBox.addEventListener("mouseout", e => { overSourceBox = false; });
sourceBox.addEventListener("scroll", e => {
  if (!overSourceBox) return;
  var sourceIndex = Number(sourcepicker.value);
  var sourceLineOffset = sourceLineCounts[sourceIndex] * (sourceBox.scrollTop / sourceBox.scrollHeight);
  var sourceLine = Math.floor(sourceLineOffset);
  var partialOffset = sourceLineOffset - sourceLine;
  var lineMappingsForLine = lineMappings.filter(mapping => mapping.sourceIndex === sourceIndex && mapping.sourceLine === sourceLine);
  if (lineMappingsForLine.length) {
    var firstLineMapping = lineMappingsForLine.reduce((prev, mapping) => mapping.sourceColumn < prev.sourceColumn ? mapping : prev);
    if (firstLineMapping) {
      scrollToMapping(firstLineMapping, sourceBox, partialOffset);
    }
  }
});

if (sources.length) {
  (<HTMLElement>sources[0]).classList.add("selected");
}

function selectMappings(current: Set<HTMLElement>, requested: Set<HTMLElement>): Set<HTMLElement> {
  if (current) {
    current.forEach(currentElement => {
      if (!requested || !requested.has(currentElement)) {
        currentElement.classList.remove("selected");
      }
    });
  }

  if (requested) {
    requested.forEach(requestedElement => {
      if (!current || !current.has(requestedElement)) {
        requestedElement.classList.add("selected");
      }
    });
  }

  return requested;
}

function setMappings(mappingIds?: string[]): void {
  if (mappingIds && mappingIds.length) {
    var lineMappings = mappingIds.map(mappingId => lineMappingMap.get(mappingId));
    if (lineMappings.length) {
      var generatedMappings = new Set<HTMLElement>();
      var sourceMappings = new Set<HTMLElement>();
      var mapMappings = new Set<HTMLElement>();
      var rawmapMappings = new Set<HTMLElement>();
      mappingIds.map(mappingId => {
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

      var sourceIndex = lineMappings.reduce((index, mapping) => typeof index !== "undefined" ? index : mapping.sourceIndex, undefined);
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

function setSource(sourceIndex: string): void {
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

function scrollToMapping(lineMapping: LineMapping, target: HTMLElement, partialOffset: number): void {
  if (target !== generatedBox) {
    generatedBox.scrollTop = partialOffset + (generatedBox.scrollHeight * (lineMapping.generatedLine / generatedLineCount));
  }

  if (target !== mapBox) {
    mapBox.scrollTop = partialOffset + (mapBox.scrollHeight * (lineMapping.generatedLine / generatedLineCount));
  }

  if (target !== sourceBox && "sourceIndex" in lineMapping) {    
    setSource(String(lineMapping.sourceIndex));
    sourceBox.scrollTop = partialOffset + (sourceBox.scrollHeight * (lineMapping.sourceLine / sourceLineCounts[lineMapping.sourceIndex]));
  }
}