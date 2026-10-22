.import "../../ui/js/ActionWheel.js" as Wheel

// Tangerine's drag wheel is an annulus split into equal sectors. These checks hold the ported
// geometry, its gap, root actions, format conversion sub-entries, and routes without a Pane.
function near(a, b) {
    return Math.abs(a - b) < 0.0001
}

function pane() {
    return {
        acted: [],
        sheets: [],
        rows: [{ n: "sample.jpg", d: false }],
        cursorIndex: 0,
        path: "/home/user",
        rowFor: function (idx) { return this.rows[idx] },
        join: function (dir, file) { return dir + "/" + file },
        act: function (action) { this.acted.push(action) },
        sheetMenuAction: function (action) { this.sheets.push(action) },
        backend: {
            convertImage: function () {}
        }
    }
}

function run(check) {
    check("the wheel has root file actions including convert", Wheel.ACTIONS.length, 7)
    check("sector 0 is at the top", near(Wheel.angleFor(0, 7), Math.PI / 2), true)
    check("sectors run clockwise", near(Wheel.angleFor(1, 6), Math.PI / 2 - Math.PI / 3), true)
    check("a three-way wheel starts at the left", near(Wheel.angleFor(0, 3), Math.PI), true)
    var zero = Wheel.pointAt(10, 0), top = Wheel.pointAt(10, Math.PI / 2)
    check("a point at angle zero is the right spoke", near(zero.x, 10) && near(zero.y, 0), true)
    check("a point at a right angle is the top spoke", near(top.x, 0) && near(top.y, -10), true)

    var radius = (Wheel.GEOMETRY.inner + Wheel.GEOMETRY.outer) / 2
    var misses = []
    for (var i = 0; i < Wheel.ACTIONS.length; i++) {
        var at = Wheel.pointAt(radius, Wheel.angleFor(i, Wheel.ACTIONS.length))
        if (Wheel.indexAt(at.x, at.y, Wheel.ACTIONS.length) !== i)
            misses.push(i)
    }
    check("every sector answers its own middle", misses.join(","), "")
    check("the hub is not a sector", Wheel.indexAt(0, 0, 7), -1)
    check("the inside edge is not a sector", Wheel.indexAt(Wheel.GEOMETRY.inner - 1, 0, 7), -1)
    check("the outside edge is not a sector", Wheel.indexAt(Wheel.GEOMETRY.outer + 1, 0, 7), -1)
    var boundary = Wheel.angleFor(0, 6) - Math.PI / 6
    var gap = Wheel.pointAt(radius, boundary)
    check("the gap between two petals belongs to neither", Wheel.indexAt(gap.x, gap.y, 6), -1)

    var paths = []
    var broken = []
    for (var p = 0; p < Wheel.ACTIONS.length; p++) {
        var path = Wheel.sectorPath(p, Wheel.ACTIONS.length, 100, 100)
        paths.push(path)
        if (path.indexOf("M ") !== 0 || path.indexOf("A ") < 0 || path.slice(-2) !== " Z" || /NaN|undefined/.test(path))
            broken.push(p)
    }
    check("every petal is a closed SVG path around the wheel's centre", broken.join(","), "")
    check("no two petals draw the same path", paths.filter(function (path, index) { return paths.indexOf(path) !== index }).length, 0)
    check("labels sit between the two rims, above their sector's middle",
          Wheel.labelPoint(0, 7).y < 0 && Wheel.labelPoint(0, 7).y > -Wheel.GEOMETRY.outer, true)
    check("the hub names the wheel at rest", Wheel.centerText(-1, "actions", Wheel.ACTIONS), "Actions")
    check("and names the lit action", Wheel.centerText(0, "actions", Wheel.ACTIONS), "Copy")
    check("and names Convert in sub-mode at rest", Wheel.centerText(-1, "convert", []), "Convert")

    // Tangerine conversion matrix checks
    var jpgFormats = Wheel.conversionFormats("jpg")
    check("jpg converts to Tangerine image targets excluding itself",
          jpgFormats.join(","), "png,webp,heic,tiff,avif,bmp,pdf")
    var mp4Formats = Wheel.conversionFormats("mp4")
    check("mp4 converts to Tangerine video targets plus gif and mp3",
          mp4Formats.join(","), "mov,mkv,webm,avi,wmv,gif,mp3")
    var mp3Formats = Wheel.conversionFormats("mp3")
    check("mp3 converts to Tangerine audio targets",
          mp3Formats.join(","), "m4a,wav,flac,ogg,opus,aiff,wma")

    // Sub-entries generation
    var p = pane()
    var subItems = Wheel.itemsFor("convert", p)
    check("convert mode returns format petals for active file", subItems.length, 7)
    check("first sub-entry is PNG with image glyph", subItems[0].label + ":" + subItems[0].glyph, "PNG:image")

    var sink = pane()
    var routes = []
    for (var r = 0; r < Wheel.ACTIONS.length; r++)
        routes.push(Wheel.run(r, sink))
    check("the seven routes match pane actions and convert", routes.join(","),
          "copy,moveTo,copyPath,addToShelf,compress:zip,convert,openTerminal")
    check("copy and the other four go through act()", sink.acted.join(","),
          "copy,moveTo,copyPath,compress:zip,openTerminal")
    check("Shelf goes through the menu's selection snapshot", sink.sheets.join(","), "addToShelf")
    check("conversion route dispatches convert:<format>",
          Wheel.run({ id: "convert:png", format: "png" }, sink), "convert:png")
    check("a missing sector runs nothing", Wheel.run(-1, sink), "")
    check("and a missing pane runs nothing", Wheel.run(0, null), "")
}
