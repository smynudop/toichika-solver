let solver:Solver

Array.prototype.unique = function () {
    return this.filter((c, i) => this.indexOf(c) == i)
}

Array.prototype.remove = function (x) {
    let i = this.indexOf(x)
    if(i>=0)this.splice(i,1)
}

class Log {
    step: number
    constructor() {
        this.step = 0
    }

    add(msg, ...roomnos) {
        roomnos = roomnos || []
        var div = $("<div></div>").html(msg)
        if (roomnos) div.data("roomno", roomnos.join(","))
        div.data("step", this.step)

        div.appendTo($("#log"))
        this.step++
    }

    adddetail(msg, ...roomnos) {
        roomnos = roomnos || []
        var div = $("<div></div>").html(msg)
        if (roomnos) div.data("roomno", roomnos.join(","))
        div.data("step", this.step)
        div.addClass("detail")

        div.appendTo($("#log"))
        this.step++
    }
}

class Board {
    bx:number
    by:number
    list:Cell[][]
    rooms:Room[]
    log: Log
    constructor(bx:number, by:number) {
        this.bx = bx
        this.by = by
        this.list = []
        for (let x = 0; x < bx; x++) {
            let ar:Cell[] = []
            for (let y = 0; y < by; y++) {
                ar.push(new Cell(x,y,this))
            }
            this.list.push(ar)
        }
        this.rooms = []
        this.log = new Log()
    }

    get isfilled() {
        return this.pendingroom().length == 0
    }

    get roomlength(){
        return this.rooms.length
    }

    getroom(no) {
        return this.rooms[no]
    }

    getcell(x, y) {
        return this.list[x][y]
    }

    getCellForNum(n, xmax?) {
        xmax = xmax || this.bx
        let y = Math.floor(n / xmax)
        let x = n % xmax
        return this.getcell(x, y)
    }

    allow() {
        let ar:Cell[] = []
        for (let l of this.list) {
            ar = ar.concat(l)
        }
        ar = ar.filter((c) => c.isAllow())
        return ar
    }

    corridorCells() {
        let result:Cell[] = []
        for (let room of this.rooms) {
            if (room.isCorridor().x && (room.d == "u" || room.d == "d")) {
                result.push(room.getPendingCells()[0])
            }
            if (room.isCorridor().y && (room.d == "l" || room.d == "r")) {
                result.push(room.getPendingCells()[0])
            }
        }
        return result
    }

    inverted() {
        let ar:Cell[] = []
        for (let y = 0; y < this.by; y++) {
            ar = ar.concat(this.list.map((l) => l[y]))
        }
        return ar
    }

    makeroom() {
        for (let cell of this) {
            if (cell.roomno == 999) {
                let r = new Room(this.roomlength, this)
                this.rooms.push(r)
                r.explore(cell)
            }
        }
    }

    detect() {
        for (let cell of this) {
            if (cell.right() && cell.br) {
                cell.addNeighbor(cell.right())
            }
            if (cell.bottom() && cell.bb) {
                cell.addNeighbor(cell.bottom())
            }
        }
    }

    pendingroom() {
        return this.rooms.filter((r) => !r.isfill)
    }

    nothasdirectionroom() {
        return this.rooms.filter((r) => !r.d)
    }

    nothaspairroom() {
        return this.rooms.filter((r) => r.d && !r.haspair)
    }

    *[Symbol.iterator]() {
        let ar:Cell[] = []
        for (let l of this.list) {
            ar = ar.concat(l)
        }
        yield* ar
    }
    disp() {
        var char = { u: "↑", d: "↓", l: "←", r: "→", b: "・", p: "" }
        $("#board").empty()

        var table = $("<table>")
        for (let i = -1; i < this.by; i++) {
            var tr = $("<tr></tr>")
            for (let j = -1; j < this.bx; j++) {
                var td = $("<td></td>")
                if (i < 0) {
                    if (j >= 0) {
                        td.text(j)
                        td.addClass("bb")
                    }
                } else {
                    if (j < 0) {
                        td.text(i)
                        td.addClass("br")
                    } else {
                        let cell = this.getcell(j, i)
                        td.text(char[cell.content])
                        if (cell.isq) td.addClass("q")
                        if (cell.br) td.addClass("br")
                        if (cell.bb) td.addClass("bb")
                        td.attr("id", "td_" + j + "_" + i)
                    }
                }
                td.appendTo(tr)
            }
            tr.appendTo(table)
        }
        table.appendTo($("#board"))
        $("<textarea></textarea>").attr("id", "debug").appendTo($("#board"))
    }

    refresh(step?, rooms?) {
        if (step === undefined) step = this.log.step
        rooms = rooms || []

        var char = { u: "↑", d: "↓", l: "←", r: "→", b: "・", p: "" }
        $("td").removeClass("fill tmp")
        let board = this
        $("td[id]").each(function (i, e) {
            let x = +$(this).attr("id")!.split("_")[1]
            let y = +$(this).attr("id")!.split("_")[2]
            let cell = board.getcell(x, y)

            if (step >= cell.step) {
                $(e).text(char[cell.content])
                if (step >= cell.allowstep) {
                    $(e).addClass("fill")
                }
            } else if (step >= cell.substep) {
                let d = cell.room().d || "p"
                $(e).text(d)
                $(e).addClass("tmp")
            } else {
                $(e).text(" ")
            }

            $(e).toggleClass("highlight3", rooms.includes(cell.roomno))
            $(e).toggleClass("highlight1", cell.step == step)
            $(e).toggleClass("highlight2", cell.pairstep == step)
        })
    }
}

interface HuntResult{
    blanks: Cells
    blanks2: Cells
    hit: string
    pairallow: Cell
    opttop: Cell
    options: Cells
    pendings: Cells
    isCorridor: boolean
}

interface ResarchResult{
    data: string[]
    ismust: boolean
    mustd: string | null
    isone: boolean
    oned: string | null
    isonly: boolean
    onlyd: string
    isblank: boolean
}

class Cell {
    x:number
    y:number
    content:string
    br:boolean
    bb:boolean
    roomno: number
    isq:boolean
    haspair: boolean
    step:number
    substep:number
    pairstep:number

    allowstep:number
    parent:Board
    dopt:any
    constructor(x, y,parent ) {
        this.x = x
        this.y = y
        this.content = "p"
        this.br = false
        this.bb = false
        this.roomno = 999
        this.isq = false
        this.haspair = false
        this.step = 999
        this.substep = 999
        this.pairstep = 999
        this.allowstep = 999
        this.parent = parent
        this.dopt = null
    }

    addNeighbor(cell) {
        this.room().addNeighbor(cell.room())
        cell.room().addNeighbor(this.room())
    }

    blank() {
        this.content = "b"
        this.step = this.parent.log.step
    }

    allow(d) {
        this.content = d
        this.step = this.parent.log.step

        let room = this.room()
        room.isfill = true
        room.setDirection(d)
        room.allowx = this.x
        room.allowy = this.y
        room.fillBlank()

        for (let cell of room) {
            cell.allowstep = this.parent.log.step
        }
    }

    room() {
        return this.parent.rooms[this.roomno]
    }

    getTarget(d) {
        let board = this.parent
        let x = this.x
        let y = this.y
        if (d == "u") {
            return board.list[x].slice(0, y).reverse()
        } else if (d == "d") {
            return board.list[x].slice(y + 1)
        } else if (d == "l") {
            return board.list
                .map((b) => b[y])
                .slice(0, x)
                .reverse()
        } else if (d == "r") {
            return board.list.map((b) => b[y]).slice(x + 1)
        }else {
            return []
        }
    }

    isPending() {
        return this.content == "p"
    }

    isAllow() {
        return this.content != "p" && this.content != "b"
    }

    isBlank() {
        return this.content == "b"
    }

    isInRegion(region) {
        for (let cell of region) {
            if (this.x == cell.x && this.y == cell.y) {
                return true
            }
        }
        return false
    }

    left() {
        if (!this.parent) return false
        let board = this.parent
        if (this.x == 0) {
            return false
        } else {
            return board.getcell(this.x - 1, this.y)
        }
    }

    top() {
        if (!this.parent) return false
        let board = this.parent
        if (this.y == 0) {
            return false
        } else {
            return board.getcell(this.x, this.y - 1)
        }
    }

    right() {
        if (!this.parent) return false
        let board = this.parent
        if (this.x == board.bx - 1) {
            return false
        } else {
            return board.getcell(this.x + 1, this.y)
        }
    }

    bottom() {
        if (!this.parent) return false
        let board = this.parent
        if (this.y == board.by - 1) {
            return false
        } else {
            return board.getcell(this.x, this.y + 1)
        }
    }

    marry(cell) {
        this.haspair = true
        cell.haspair = true

        this.room().marry(cell.roomno)

        this.pairstep = this.parent.log.step
        cell.pairstep = this.parent.log.step
    }

    pos() {
        return `R${this.x}C${this.y}`
    }

    topzpr() {
        let ds = { u: 1, d: 2, l: 3, r: 4, b: "+", p: "." }
        return ds[this.content]
    }
    isNeighbor(cell) {
        return this.room().isNeighbor(cell.room())
    }
    hunt(d, debug=false) {
        let target = this.getTarget(d)
        let pd = paird(d)
        let xy = {"l":"y","r":"y","u":"x","d":"x"}
        let axis = xy[d]


        //blanks: 矢印から調べる場合の確定白マス
        //blanks2: 廊下から調べる場合の確定白マス
        //options: 矢印の先にある、相方候補になるマス
        //pendings: 矢印の先の、中身が決まっていないマス

        let result:HuntResult = {
            blanks: new Cells(),
            blanks2: new Cells(),
            hit: "wall",
            pairallow: new Cell(0,0,this),
            opttop: new Cell(0,0,this),
            options: new Cells(),
            pendings: new Cells(),
            isCorridor: false,
        }

        let cross = 0
        let nowroomno = this.roomno
        let iscont = true
        let istestbreak = false
        let breakflg = false

        //checkのほう
        for (let cell of target) {
            if (debug) console.log(cell.x, cell.y)
            if (cell.isAllow()) {
                //矢印にぶつかったら
                if (cell.content == pd) {
                    result.hit = "pair"
                    result.pairallow = cell
                }
                if (debug) console.log("矢印です。探索を終了します")
                break
            }
            if (cell.roomno != nowroomno) {
                //境界線をまたいだら
                nowroomno = cell.roomno
                cross++
                if (debug) console.log("境界をまたぎました")
            }
            if (
                iscont &&
                (cell.isBlank() ||
                    this.isNeighbor(cell) ||
                    cell.isReserved(pd) ||
                    !this.room().canMarry(cell.roomno))
            ) {
                if (debug) console.log("このマスは白マスのようです")
                if (cell.isPending()) {
                    result.blanks.push(cell)
                    if (cross > 0) {
                        result.blanks2.push(cell)
                    }
                }
            } else {
                if (debug) console.log("このマスは白マスじゃないようです")
                if (iscont) {
                    result.isCorridor = cell.room().isCorridor(this, d)[axis] && !cell.room().d
                }
                //if(cell.room().isCorridor(this, d)) breakflg = true
                iscont = false
                if (cell.isPending()) {
                    result.pendings.push(cell)
                    if (
                        !this.isNeighbor(cell) &&
                        !cell.isReserved(pd) &&
                        this.room().canMarry(cell.roomno)
                    ) {
                        result.options.push(cell)
                    }
                }
            }
        }
        result.opttop = result.options.getcell(0)

        return result
    }

    research(d, debug?) {
        let target = this.getTarget(d)
        let pd = paird(d)
        let xy = {"l":"y","r":"y","u":"x","d":"x"}
        let axis = xy[d]


        let result = {
            hit: "wall",
            pairallow: null,
            opttop: null,
            options: new Cells(),
            pendings: new Cells(),
        }

        let cross = 0
        let nowroomno = this.roomno
        let iscont = true

        for (let cell of target) {
            if (cell.isAllow()) {
                if (cell.content == pd && !this.isNeighbor(cell)) {
                    result.hit = "pair"
                }
                break
            }
            if (cell.roomno != nowroomno) {
                nowroomno = cell.roomno
                cross++
                if (cell.room().isCorridor(this, d)[axis]) {
                    if (cross == 1) {
                        break
                    } else if (cell.room().d) {
                        if (cell.room().d == pd) {
                            result.hit = "pairroom" // 自分と向き合う廊下なら終了
                        }
                        break
                    }
                }
            }
            if (cell.isPending()) {
                result.pendings.push(cell)
            }
            if (
                iscont &&
                (cell.isBlank() ||
                    this.isNeighbor(cell) ||
                    cell.isReserved(pd) ||
                    !cell.room().canMarry(this.roomno))
            ) {
                iscont = true
            } else {
                iscont = false
                if (cell.isPending()) {
                    result.options.push(cell)
                }
            }
        }

        return result
    }

    researchAll() {
        var dl = ["u", "d", "l", "r"]
        let m = 0,
            a = 0,
            n = 0
        let r:ResarchResult = {
            data: [],
            ismust: false,
            mustd: null,
            isone: false,
            oned: null,
            isonly: false,
            onlyd: "a",
            isblank: false,
        }
        for (let d of dl) {
            let result = this.research(d)
            if (result.hit == "pair" || result.hit == "pairroom") {
                if (result.pendings.length == 0) {
                    r.data.push("must")
                    m++
                } else {
                    r.data.push("able")
                    a++
                }
            } else {
                if (result.options.length == 0) {
                    r.data.push("not")
                    n++
                } else {
                    r.data.push("able")
                    a++
                }
            }
        }

        if (m + a == 1) {
            r.isonly = true
            r.onlyd = dl[r.data.indexOf("must") + r.data.indexOf("able") + 1]
        }
        if (m == 1) {
            r.ismust = true
            r.mustd = dl[r.data.indexOf("must")]
        } else if (a == 1) {
            r.isone = true
            r.oned = dl[r.data.indexOf("able")]
        }
        if (n == 4) {
            r.isblank = true
        }
        return r
    }

    setdopt(d) {
        this.dopt = d
    }

    isReserved(d) {
        let conda = this.dopt && this.dopt != d
        let condb = this.room().isReserved(d)
        return conda || condb
    }
}

class Cells {
    cells:Cell[]

    constructor(array?) {
        array = array || []
        this.cells = array
    }

    get length(){
        return this.cells.length
    }

    push(cell) {
        this.cells.push(cell)
    }

    isSameRoom() {
        if (!this.length) return false
        return this.cells.every((c) => c.roomno == this.cells[0].roomno)
    }

    includes(cell) {
        return this.indexOf(cell) !== -1
    }

    indexOf(cell) {
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i].x == cell.x && this.cells[i].y == cell.y) {
                return i
            }
        }
        return -1
    }

    concat(cells) {
        this.cells = this.cells.concat(cells.cells)
    }

    getcell(no) {
        return this.cells[no]
    }

    blank() {
        for (let cell of this.cells) {
            cell.blank()
        }
    }

    unique() {
        this.cells = this.cells.filter((c, i) => this.indexOf(c) == i)
    }

    *[Symbol.iterator]() {
        yield* this.cells
    }
}

class Room {
    no: number
    cells:Cell[]
    neighbor:number[]
    isfill:boolean
    d:string | null
    allowx: number | null
    allowy: number | null
    parent: Board
    pairno: number | null
    pairopt: any

    constructor(no, parent) {
        this.no = no
        this.cells = []
        this.neighbor = [no]
        this.isfill = false
        this.d = null
        this.allowx = null
        this.allowy = null
        this.parent = parent
        this.pairno = null
        this.pairopt = null
    }

    addcell(cell) {
        this.cells.push(cell)
        cell.roomno = this.no
    }

    addNeighbor(room) {
        this.neighbor.push(room.no)
        this.neighbor = this.neighbor.filter((x, i, self) => self.indexOf(x) === i)
    }

    getcell(no) {
        return this.cells[no]
    }

    getPendingCells() {
        return this.cells.filter((c) => c.isPending())
    }

    fillBlank() {
        for (let cell of this.cells) {
            if (cell.isPending()) {
                cell.blank()
            }
        }
    }

    isNeighbor(room) {
        return this.neighbor.includes(room.no)
    }

    isCorridor(cell?, d?) {
        let pending = this.getPendingCells()
        if (pending.length == 0) return {x:false, y:false}

        let x, y
        if (cell) {
            x = cell.x
            y = cell.y
        } else {
            x = pending[0].x
            y = pending[0].y
        }

        let isx = pending.every((c) => c.x == x)
        if (isx) {
            let ys = pending.map((c) => c.y)
            for (let yy = Math.min(...ys); yy <= Math.max(...ys); yy++) {
                if (this.parent.getcell(x, yy).roomno != this.no) {
                    isx = false
                }
            }
        }
        let isy = pending.every((c) => c.y == y)
        if (isy) {
            let xs = pending.map((c) => c.x)
            for (let xx = Math.min(...xs); xx <= Math.max(...xs); xx++) {
                if (this.parent.getcell(xx, y).roomno != this.no) {
                    isy = false
                }
            }
        }

        if (d == "l" || d == "r") {
            return { x: false, y: isy }
        } else if (d == "u" || d == "d") {
            return { x: isx, y: false }
        } else {
            return { x: isx, y: isy }
        }
    }

    canMarry(roomno) {
        if (this.pairopt) {
            return this.pairopt.includes(roomno)
        }
        return this.pairno === null || this.pairno == roomno
    }

    marry(roomno) {
        this.setpairno(roomno)
        this.parent.getroom(roomno).setpairno(this.no)
    }

    haspair() {
        return this.pairno !== null
    }

    explore(...cells) {
        let target = new Cells()
        for (let cell of cells) {
            this.addcell(cell)
        }
        for (let cell of cells) {
            if (cell.right() && cell.right().roomno === 999 && !cell.br) {
                target.push(cell.right())
            }
            if (cell.bottom() && cell.bottom().roomno === 999 && !cell.bb) {
                target.push(cell.bottom())
            }
            if (cell.top() && cell.top().roomno === 999 && !cell.top().bb) {
                target.push(cell.top())
            }
            if (cell.left() && cell.left().roomno === 999 && !cell.left().br) {
                target.push(cell.left())
            }
        }
        target.unique()
        if (target.length) this.explore(...target)
    }

    setDirection(d) {
        this.d = d
        for (let cell of this) {
            if (cell.substep == 999) cell.substep = this.parent.log.step
        }
    }

    pendingCells() {
        let cells = new Cells()
        for (let cell of this) {
            if (cell.isPending()) cells.push(cell)
        }
        return cells
    }

    setpairno(no) {
        this.pairno = no
    }

    isReserved(d) {
        return this.d && this.d != d
    }

    *[Symbol.iterator]() {
        yield* this.cells
    }
}

class IO {
    static decode() {
        if (solver.mode == "url") {
            return IO.decodeURL()
        } else {
            return IO.decodeBorder()
        }
    }

    static decodeURL() {
        var url = $("#url").val()!
        $("#log").empty()

        var para = String(url).split("/")
        let bx = +para[para.length - 3]
        let by = +para[para.length - 2]
        var btext = para[para.length - 1]

        let board = new Board(bx, by)

        let vbtextlength = Math.ceil(((bx - 1) * by) / 5)
        for (let i = 0; i < vbtextlength; i++) {
            var isb = parseInt(btext[i], 32).toString(2)
            isb = ("00000" + isb).slice(-5)

            for (let j = 0; j < 5; j++) {
                if (i * 5 + j >= (bx - 1) * by) break
                board.getCellForNum(i * 5 + j, bx - 1).br = !!(+isb[j])
            }
        }

        btext = btext.slice(vbtextlength)

        let wbtextlength = Math.ceil((bx * (by - 1)) / 5)
        for (let i = 0; i < wbtextlength; i++) {
            var isb = parseInt(btext[i], 32).toString(2)
            isb = ("00000" + isb).slice(-5)
            for (let j = 0; j < 5; j++) {
                if (i * 5 + j >= (by - 1) * bx) break
                board.getCellForNum(i * 5 + j).bb = !!(+isb[j])
            }
        }

        btext = btext.slice(wbtextlength)

        board.makeroom()

        var c = 0
        for (let i = 0; i < btext.length; i++) {
            var n = parseInt(btext[i], 36)
            if (n <= 4) {
                let cell = board.getCellForNum(c)
                let d = ["", "u", "d", "l", "r"][n]
                cell.allow(d)
                cell.isq = true
                c++
            } else {
                c = c + (n - 4)
            }
        }

        board.detect()
        board.log.add("URLの解析が完了しました。\n")

        board.disp()
        board.refresh()

        return board
    }

    static decodeBorder() {
        $("#log").empty()

        var border = String($("#border").val()).trim().split("\n")
        let by = (border.length - 1) / 2
        let bx = (border[0].length - 1) / 2

        let board = new Board(bx, by)

        for (let cell of board) {
            let y = cell.y
            let x = cell.x
            cell.br = border[y * 2 + 1][x * 2 + 2] != "　"
            cell.bb = border[y * 2 + 2][x * 2 + 1] != "　"
        }

        board.makeroom()
        board.detect()

        board.log.add("URLの解析が完了しました。\n")

        board.disp()
        board.refresh()

        return board
    }

    static encodepzpr(board:Board) {
        var txt = ""
        txt =
            txt + "pzprv3\ntoichika\n" + board.by + "\n" + board.bx + "\n" + board.roomlength + "\n"
        for (let cell of board.inverted()) {
            txt = txt + cell.roomno + " "
            if (cell.x == board.bx - 1) txt += "\n"
        }
        for (let cell of board.inverted()) {
            if (cell.isq) {
                txt = txt + cell.topzpr() + " "
            } else {
                txt = txt + ". "
            }

            if (cell.x == board.bx - 1) txt += "\n"
        }
        for (let cell of board.inverted()) {
            if (!cell.isq) {
                txt = txt + cell.topzpr() + " "
            } else {
                txt = txt + ". "
            }
            if (cell.x == board.bx - 1) txt += "\n"
        }
        txt += "\n"
        txt += 'history:{\n "type": "pzpr",\n "version": 0.4\n}'
        $("#pzpr").val(txt)
    }

    static download() {
        //ファイルを作ってダウンロードします。
        var txt = String($("textarea").val())
        var downLoadLink = document.createElement("a")
        downLoadLink.download = "toichika.txt"
        downLoadLink.href = URL.createObjectURL(new Blob([txt], { type: "text.plain" }))
        downLoadLink.dataset.downloadurl = [
            "text/plain",
            downLoadLink.download,
            downLoadLink.href,
        ].join(":")
        downLoadLink.click()
    }
}

function find_matching(graph, matching?, result?) {
    if (!matching) {
        matching = []
        matching.length = graph.length
    }
    result = result || []

    let target:number|null = null

    for (let i = 0; i < graph.length; i++) {
        if (graph[i] === null || graph[i] === undefined) {
            continue
        }
        if (graph[i].length >= 1) {
            target = i
            if (graph[i].length == 1) break
        }
        if (graph[i].length == 0) {
            return result
        }
    }

    if (target === null) {
        result.push(matching)
        return result
    }

    for (let no of graph[target]) {
        let graph2 = JSON.parse(JSON.stringify(graph))
        let matching2 = JSON.parse(JSON.stringify(matching))

        for (let i = 0; i < graph2.length; i++) {
            if (graph2[i] === null) continue
            graph2[i] = graph2[i].remove(no)
            graph2[i] = graph2[i].remove(target)
            if (i == no || i == target) graph2[i] = null
        }
        matching2[no] = target
        matching2[target] = no
        result = find_matching(graph2, matching2, result)
    }
    return result
}

function paird(d) {
    let pairs = { u: "d", d: "u", l: "r", r: "l" }
    return pairs[d]
}


class Solver {
    board: Board
    mode: string
    constructor() {
        this.board = new Board(1,1)
        this.mode = "url"
    }

    analysis() {
        this.board = IO.decode()
        this.board.log.add("解析開始")

        this.solve()

        this.board.log.add("終了")
        this.board.refresh()

        let _this = this

        $("#log div").click(function () {
            let step = $(this).data("step")
            let rooms = $(this).data("roomno")

            $("#log div").removeClass("highlight1")
            $(this).addClass("highlight1")

            rooms = rooms
                .split(",")
                .filter((x) => x)
                .map((x) => +x)
            _this.board.refresh(step, rooms)
        })

        IO.encodepzpr(this.board)
    }

    solve() {
        var a = 1,
            b = 1
        do {
            do {
                this.basicsolve()
                if (this.board.isfilled) break
                a = this.checkCorridor() + this.checkRoomPair()
            } while (a)

            if (this.board.isfilled) break
            b = this.pickalloption()
        } while (b)
    }

    basicsolve() {
        var a = 1,b=1,c=1

        do {
            do {
                do {
                    a = this.checkTipOfAllow()
                } while (a)
                b = this.checkOneCellLeftRoom()
            } while (b)

            if (this.board.isfilled) break

            this.checkAllCell()
            c = this.checkOneCellLeftRoom()
        } while (c)
    }

    checkTipOfAllow() {
        //ペアのいない矢印の先を探索します。
        let board = this.board
        let cnt = 0
        let pairs = { u: "d", d: "u", l: "r", r: "l" }

        for (let allow of board.allow()) {
            if (allow.haspair) continue

            let d = allow.content
            let result:HuntResult = allow.hunt(d)

            let pd = pairs[d]
            let options = result.options
            let pendings = result.pendings
            let isCorridor = result.isCorridor
            let blanks = result.blanks
            let pair = result.pairallow
            let opttop = result.opttop

            blanks.blank()

            if (result.hit == "pair") {
                if (options.length == 0) {
                    allow.marry(pair)
                    board.log.adddetail(
                        "\t" + allow.pos() + "と" + pair.pos() + "はペア(間に未確定マスがない)"
                    )
                    cnt++
                } else if (pendings.isSameRoom()) {
                    allow.marry(pair)
                    pendings.blank()
                    board.log.adddetail(
                        "\t" + allow.pos() + "と" + pair.pos() + "はペア(間の未確定マスが1部屋)"
                    )
                    cnt++
                } else if (isCorridor) {
                    opttop.room().setDirection(pd)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.pos() +
                            "とペア、" +
                            pd +
                            "向き(廊下)",
                        opttop.roomno
                    )
                    cnt++
                }
            } else {
                if (options.length == 1) {
                    allow.marry(opttop)
                    opttop.allow(pd)
                    board.log.add(
                        "\t" +
                            opttop.pos() +
                            "が" +
                            pd +
                            "に確定(" +
                            allow.pos() +
                            "の唯一の相方候補)"
                    )
                    cnt++
                } else if (options.isSameRoom() && !opttop.room().d) {
                    for (let cell of opttop.room()) {
                        if (!options.includes(cell) && cell.isPending()) {
                            cell.blank()
                        }
                    }
                    opttop.room().setDirection(pd)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.pos() +
                            "とペア、" +
                            pd +
                            "向き",
                        opttop.roomno
                    )
                    cnt++
                } else if (blanks.length > 0) {
                    board.log.adddetail("\t矢印の先の白マスを" + blanks.length + "個確定")
                    cnt++
                } else if (isCorridor) {
                    opttop.room().setDirection(pd)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.pos() +
                            "とペア、" +
                            pd +
                            "向き(廊下)",
                        opttop.roomno
                    )
                }
            }
        }
        return cnt
    }

    checkTipOfCorridor() {
        let board = this.board
        let cnt = 0
        let pairs = { u: "d", d: "u", l: "r", r: "l" ,"p":"error"}

        for (let allow of board.corridorCells()) {
            let d = allow.room().d || "p"
            let result = allow.hunt(d)
            let pd = pairs[d]
            let options = result.options
            let pendings = result.pendings
            let isCorridor = result.isCorridor
            let blanks = result.blanks
            let pair = result.pairallow
            let opttop = result.opttop

            result.blanks2.blank()

            if (result.hit == "pair") {
                if (isCorridor) {
                    opttop.room().setDirection(pd)
                    allow.room().marry(opttop.roomno)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.roomno +
                            "とペア、" +
                            pd +
                            "向き(廊下)",
                        opttop.roomno,
                        allow.roomno
                    )
                    cnt++
                }
            } else {
                if (options.length == 1) {
                    opttop.allow(pd)
                    board.log.add(
                        "\t" +
                            opttop.pos() +
                            "が" +
                            pd +
                            "に確定(" +
                            allow.roomno +
                            "番の部屋の唯一の相方候補)",
                        allow.roomno
                    )
                    cnt++
                } else if (options.isSameRoom() && !opttop.room().d) {
                    for (let cell of opttop.room()) {
                        if (!options.includes(cell) && cell.isPending()) {
                            cell.blank()
                        }
                    }
                    opttop.room().setDirection(pd)
                    allow.room().marry(opttop.roomno)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.roomno +
                            "とペア、" +
                            pd +
                            "向き",
                        opttop.roomno,
                        allow.roomno
                    )
                    cnt++
                } else if (result.blanks2.length > 0) {
                    board.log.adddetail("\t廊下の先の白マスを" + result.blanks2.length + "個確定")
                    cnt++
                } else if (isCorridor) {
                    opttop.room().setDirection(pd)
                    allow.room().marry(opttop.roomno)
                    board.log.adddetail(
                        "\t" +
                            opttop.roomno +
                            "番の部屋は" +
                            allow.roomno +
                            "とペア、" +
                            pd +
                            "向き(廊下)",
                        opttop.roomno,
                        allow.roomno
                    )
                }
            }
        }
        return cnt
    }
    checkOneCellLeftRoom() {
        let cnt = 0,
            board = this.board
        for (let room of board.rooms) {
            let pendingCells = room.getPendingCells()
            if (pendingCells.length == 1) {
                let cell = pendingCells[0]
                let result = cell.researchAll()

                if (room.d) {
                    cell.allow(room.d)
                    board.log.add("\t" + cell.pos() + "が" + room.d + "に確定(未確定マス1、部屋)")
                    cnt++
                } else if (result.ismust) {
                    cell.allow(result.mustd)
                    board.log.add(
                        "\t" +
                            cell.pos() +
                            "が" +
                            result.mustd +
                            "に確定(未確定マス1、このマスを指す矢印あり)"
                    )
                    cnt++
                } else if (result.isone) {
                    cell.allow(result.oned)
                    board.log.add(
                        "\t" +
                            cell.pos() +
                            "が" +
                            result.oned +
                            "に確定(未確定マス1、この方向にしか入らない)"
                    )
                    cnt++
                }
            }
        }
        return cnt
    }
    checkAllCell() {
        let cnt = 0,
            board = this.board 
        console.log("全マスチェック")

        for (let cell of board) {
            if (!cell.isPending()) continue

            let result = cell.researchAll()
            console.log(cell.pos())
            console.log(result)

            if (result.isblank) {
                cell.blank()
                cnt++
            }
            if (result.ismust) {
                cell.setdopt(result.mustd)
            }
        }
        if (cnt) {
            board.log.add("\t全探索により" + cnt + "マスの白マスを確定")
        }
    }

    changeInput() {
        $("#url").toggle()
        $("#border").toggle()
        this.mode = this.mode == "url" ? "border" : "url"
    }
    pickalloption() {
        let cnt = 0,
            board = this.board
        board.log.adddetail("ペアになりうる部屋をごにょごにょします(難しい処理)")
        let option:number[][] = []
        for (let room of board.rooms) {
            if (room.haspair()) continue
            let rs
            if (room.isfill) {
                let cell = board.getcell(room.allowx, room.allowy)
                let r = cell.hunt(cell.content)
                rs = r.options
                if (r.hit == "pair" && r.pairallow.room().canMarry(room.no)) rs.push(r.pairallow)
            } else {
                let ds = room.d ? [room.d] : ["u", "d", "l", "r"]
                rs = new Cells()
                for (let d of ds) {
                    for (let cell of room.pendingCells()) {
                        let r = cell.hunt(d)
                        rs.concat(r.options)
                        if (r.hit == "pair" && r.pairallow.room().canMarry(room.no))
                            rs.push(r.pairallow)
                    }
                }
            }
            option[room.no] = rs.cells.map((c) => c.roomno).unique()
        }
        for (let i = 0; i < option.length; i++) {
            let opt = option[i]
            if (!opt) continue
            option[i] = opt.filter((o) => option[o].includes(i))
        }
        if (option.filter((o) => o).length < 12 && false) {
            let matchings = find_matching(option)
            for (let i = 0; i < option.length; i++) {
                let opt = matchings.map((m) => m[i]).unique()
                let n = opt[0]
                if (n === null || n === undefined) continue
                if (opt.length == 1) {
                    if (i < n) {
                        board.log.adddetail("\t" + i + "番と" + n + "番はペア", i, n)
                    }
                    board.getroom(i).marry(n)
                    cnt++
                }
                board.getroom(i).pairopt = opt
            }
        } else {
            board.log.add("部屋数が多かったのでやめました。")
        }

        return cnt
	}
	checkCorridor() {
		//未確定の部屋のセルを全探索して、全てのセルが1方向しか向けないとき、その部屋の向きを確定します。
		//名前変えなきゃね
		var cnt = 0, board = this.board
		for (let room of board.rooms) {
			if (room.isfill || room.d) continue
			let rs:ResarchResult[] = []
			for (let cell of room.pendingCells()) {
				rs.push(cell.researchAll())
			}
			if (rs.length == 0) {
				continue
			}
			if (rs.every((r) => r.isonly && r.onlyd == rs[0].onlyd)) {
				room.setDirection(rs[0].onlyd)
				cnt++
				board.log.adddetail("\t" + room.no + "番の部屋は" + room.d + "向き(全調査)", room.no)
			}
		}
		this.checkTipOfCorridor()
		return cnt
	}

    checkRoomPair() {
		//未確定の部屋のセルを全探索して、相方候補になる部屋が定まるとき、それを確定します。
		let cnt = 0,board = this.board
		for (let room of board.rooms) {
			if (room.isfill || room.haspair()) continue
			let ds = room.d ? [room.d] : ["u", "d", "l", "r"]
			let rs = new Cells()
			for (let d of ds) {
				for (let cell of room.pendingCells()) {
					let r = cell.hunt(d)
					rs.concat(r.options)
					if (r.hit == "pair") rs.push(r.pairallow)
				}
			}
	
			if (rs.isSameRoom()) {
				let cell = rs.getcell(0)
				room.marry(cell.roomno)
				if (room.d && !cell.room().d) {
					cell.room().setDirection(paird(room.d))
					board.log.adddetail(
						"\t" + cell.roomno + "番は" + room.no + "番とペア、" + paird(room.d) + "向き",
						cell.roomno,
						room.no
					)
				} else {
					board.log.adddetail(
						"\t" + cell.roomno + "番は" + room.no + "番とペア",
						cell.roomno,
						room.no
					)
				}
				cnt++
			}
		}
		return cnt
	}
}

function clr() {
    $("#url").val("")
    $("#border").val("").focus()
}

function dispRoomno() {
    $("td").removeClass("fill tmp")
    $("td[id]").each(function (i, e) {
        let x = +$(this).attr("id")!.split("_")[1]
        let y = +$(this).attr("id")!.split("_")[2]
        let cell = solver.board.getcell(x, y)

        $(e).text(cell.roomno)
    })
}

$(function () {
    solver = new Solver()

    $("#solve").click(function () {
        solver.analysis()
    })
    $("#clr").click(() => clr())
    $("#changeInput").click(() => solver.changeInput())
    $("#manual_menu").click(function () {
        $("#manual").toggle()
    })
    $(window).keydown(function (e) {
        if (e.keyCode == 38) {
            var selected = $("div.highlight1")
            if (selected.length) {
                selected.prev().click()
            } else {
                $("#log div:first").click()
            }
            return false
        } else if (e.keyCode == 40) {
            var selected = $("div.highlight1")
            if (selected.length) {
                selected.next().click()
            } else {
                $("#log div:first").click()
            }
            return false
        }
    })
})
