try {
    pushd $PSScriptRoot;
    node_modules\.bin\jake.cmd;
} finally {
    popd;
}

node $PSScriptRoot\bin\cli.js @args;
