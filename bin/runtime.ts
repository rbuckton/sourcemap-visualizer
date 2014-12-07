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
var sourceMappings = document.querySelectorAll("div.source > span.mapping");
var generatedMappings = document.querySelectorAll("div.generated > span.mapping");
var mapMappings = document.querySelectorAll("div.map > div.line > span.mapping");
var sourcepicker = <HTMLSelectElement>document.querySelector("#source");
var sourceBox = <HTMLDivElement>document.querySelector(".source-box");
var generatedBox = <HTMLDivElement>document.querySelector(".generated-box");
var mapBox = <HTMLDivElement>document.querySelector(".map-box");

var sourceFileMap = new Map<string, HTMLElement>();
for (var i = 0; i < sources.length; i++) {
  var source = <HTMLElement>sources[i];
  sourceFileMap.set(source.getAttribute("data-source"), source);
}

var sourceMappingIdMap = new Map<string, HTMLElement>();
for (var i = 0; i < sourceMappings.length; i++) {
  var sourceMapping = <HTMLElement>sourceMappings[i];
  sourceMappingIdMap.set(sourceMapping.getAttribute("data-mapping"), sourceMapping);
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

var lineMappingMap = new Map<string, LineMapping>();
for (var i = 0; i < lineMappings.length; i++) {
  lineMappingMap.set(String(lineMappings[i].id), lineMappings[i]);
}

if (sourcepicker) {
  sourcepicker.addEventListener("change", e => {
    setSource(sourcepicker.value);
  });
}

var currentGeneratedMapping: HTMLElement;
var currentSourceMapping: HTMLElement;
var currentMapMapping: HTMLElement;
var currentSource: HTMLElement;
document.addEventListener("mouseover", e => {
  var element = <HTMLElement>e.target;
  if (element.classList.contains("mapping")) {
    e.stopImmediatePropagation();
    var id = element.getAttribute("data-mapping");
    setMapping(id);
  }
});

document.addEventListener("mouseout", e => {
  var element = <HTMLElement>e.target;
  if (element.classList.contains("mapping")) {
    e.stopImmediatePropagation();
    setMapping(undefined);
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
          node.classList.contains("map-box")) {
        box = node;
        break;
      }
    }

    var id = element.getAttribute("data-mapping");
    scrollToMapping(lineMappingMap.get(id), box, 0);
  }
})

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

function setMapping(mappingId: string): void {
  if (mappingId) {
    var lineMapping = lineMappingMap.get(mappingId);
    if (lineMapping) {
      var generatedMapping = generatedMappingIdMap.get(mappingId);
      var mapMapping = mapMappingIdMap.get(mappingId);
      var sourceMapping = sourceMappingIdMap.get(mappingId);
      setSource(String(lineMapping.sourceIndex));
    }
  }

  if (generatedMapping !== currentGeneratedMapping) {
    if (currentGeneratedMapping) {
      currentGeneratedMapping.classList.remove("selected");
    }
    currentGeneratedMapping = generatedMapping;
    if (currentGeneratedMapping) {
      currentGeneratedMapping.classList.add("selected");
    }
  }

  if (sourceMapping !== currentSourceMapping) {
    if (currentSourceMapping) {
      currentSourceMapping.classList.remove("selected");
    }
    currentSourceMapping = sourceMapping;
    if (currentSourceMapping) {
      currentSourceMapping.classList.add("selected");
    }
  }

  if (mapMapping !== currentMapMapping) {
    if (currentMapMapping) {
      currentMapMapping.classList.remove("selected");
    }
    currentMapMapping = mapMapping;
    if (currentMapMapping) {
      currentMapMapping.classList.add("selected");
    }
  }
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

  if (target !== sourceBox) {    
    setSource(String(lineMapping.sourceIndex));
    sourceBox.scrollTop = partialOffset + (sourceBox.scrollHeight * (lineMapping.sourceLine / sourceLineCounts[lineMapping.sourceIndex]));
  }
}