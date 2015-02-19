#Source Map Visualizer 

A project to make the visualization of source maps based on the [Source Map v3 spec](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#!).  

##Get Setup

1. clone the repo
2. `npm install`
3. Run jake

You'll also need jake which you can install with `npm install -g jake` [more](http://jakejs.com/).

##Create Visualizations
To create a visualization for your source map you need to:

1. From the bin directory `node sourcemap <path to map file>`

This will output an html file of the same name as the map file with an appended .html. All that's left is to open the file in your browser.