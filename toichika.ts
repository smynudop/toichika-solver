let solver:Solver

interface iDirection{
    name:string
    pair:string
    axis:string
    isFilled: boolean
    isAllow: boolean
    text:string
    pzpr:string
}

const P:iDirection = { //pending
    name:"p",
    isFilled: false,
    text:"",
    pzpr:".",
    pair:"",
    axis:"",
    isAllow: false
}

const B:iDirection = { //blank
    name:"b",
    isFilled: true,
    text:"・",
    pzpr:"+",
    pair:"",
    axis:"",
    isAllow:false
}

const U:iDirection = {
    name:"u",
    pair:"d",
    axis:"x",
    isFilled: true,
    text:"↑",
    pzpr:"1",
    isAllow: true
}

const D:iDirection = {
    name:"d",
    pair:"u",
    axis:"x",
    isFilled: true,
    text:"↓",
    pzpr:"2",
    isAllow: true
}

const L:iDirection = {
    name:"l",
    pair:"r",
    axis:"y",
    isFilled: true,
    text:"←",
    pzpr:"3",
    isAllow: true
}

const R:iDirection = {
    name:"r",
    pair:"l",
    axis:"y",
    isFilled: true,
    text:"→",
    pzpr:"4",
    isAllow: true
}

class Direction implements iDirection{
    name:string
    pair:string
    axis:string
    isFilled: boolean
    text:string
    pzpr:string
    isAllow:boolean
    constructor(data:iDirection){
        this.name = data.name
        this.pair = data.pair
        this.axis = data.axis
        this.isFilled = data.isFilled
        this.text = data.text
        this.pzpr = data.pzpr
        this.isAllow = data.isAllow
    }

    get isPending(){
        return !this.isFilled
    }

    toString(){
        return this.name
    }

    is(d:Direction){
        return this.name == d.name
    }

    isPair(d:Direction){
        return this.pair == d.name
    }

    pairDirection():Direction{
        return dir[this.pair]
    }
}

const dir:{[key:string]:Direction} = {
    P:new Direction(P),
    B:new Direction(B),
    L:new Direction(L),
    R:new Direction(R),
    U:new Direction(U),
    D:new Direction(D),
    l:new Direction(L),
    r:new Direction(R),
    u:new Direction(U),
    d:new Direction(D)
}


const dirList = [dir.U,dir.D,dir.L,dir.R]

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

    sub(msg, ...roomnos) {
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

    setup(){
        this.makeroom()
        this.detect()
        this.log.add("URLの解析が完了しました。\n")

        this.disp()
        this.refresh()
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
        ar = ar.filter((c) => c.isAllow)
        return ar
    }

    corridorCells() {
        let result:Cell[] = []
        for (let room of this.rooms) {
            let isCorridor = room.isCorridor()
            if (isCorridor.x && room.d.axis == "x") {
                result.push(room.getPendingCells()[0])
            }
            if (isCorridor.y && room.d.axis == "y") {
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
            if (cell.roomno != 999) continue
            let r = new Room(this.roomlength, this)
            this.rooms.push(r)
            r.explore(cell)
        }
    }

    detect() {
        for (let cell of this) {
            let r = cell.right()
            if (r && cell.br) {
                cell.addNeighbor(r)
            }
            let b = cell.bottom()
            if (b && cell.bb) {
                cell.addNeighbor(b)
            }
        }
    }

    pendingroom() {
        return this.rooms.filter((r) => !r.isfill)
    }

    nothasdirectionroom() {
        return this.rooms.filter((r) => r.d.isPending)
    }

    nothaspairroom() {
        return this.rooms.filter((r) => r.d.isFilled && !r.haspair)
    }

    *[Symbol.iterator]() {
        let ar:Cell[] = []
        for (let l of this.list) {
            ar = ar.concat(l)
        }
        yield* ar
    }
    disp() {
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
                        td.text(cell.content.text)
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

        $("td").removeClass("fill tmp")
        let board = this
        $("td[id]").each(function (i, e) {
            let x = +$(this).attr("id")!.split("_")[1]
            let y = +$(this).attr("id")!.split("_")[2]
            let cell = board.getcell(x, y)

            if (step >= cell.step) {
                $(e).text(cell.content.text)
                if (step >= cell.allowstep) {
                    $(e).addClass("fill")
                }
            } else if (step >= cell.substep) {
                let d = cell.room.d.text
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
    mustd: Direction | null
    oned: Direction | null
    onlyd: Direction | null
    isblank: boolean
}

class Cell {
    x:number
    y:number
    content:Direction
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
    dopt:Direction
    constructor(x:number, y:number, parent:Board) {
        this.x = x
        this.y = y
        this.content = dir.P
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
        this.dopt = dir.P
    }

    toString(){
        return this.pos()
    }

    addNeighbor(cell:Cell) {
        this.room.addNeighbor(cell.room)
        cell.room.addNeighbor(this.room)
    }

    blank() {
        this.content = dir.B
        this.step = this.parent.log.step
    }

    allow(d:Direction) {
        this.content = d
        this.step = this.parent.log.step

        let room = this.room

        room.setDirection(d)
        room.allow = this
        room.fillBlank()

        for (let cell of room) {
            cell.allowstep = this.parent.log.step
        }
    }

    get room() {
        return this.parent.rooms[this.roomno]
    }

    getTarget(d:Direction) {
        let board = this.parent
        let x = this.x
        let y = this.y
        switch(d.name){
            case "u":
                return board.list[x].slice(0, y).reverse()
            case "d":
                return board.list[x].slice(y + 1)
            case "l":
                return board.list
                    .map((b) => b[y])
                    .slice(0, x)
                    .reverse()
            case "r":
                return board.list.map((b) => b[y]).slice(x + 1)
            default:
                return []
        }
    }

    get isPending() {
        return !this.content.isFilled
    }

    get isAllow() {
        return this.content.isAllow
    }

    isBlank() {
        return this.content.name == "b"
    }

    left() {
        let board = this.parent
        if (this.x == 0) {
            return false
        } else {
            return board.getcell(this.x - 1, this.y)
        }
    }

    top() {
        let board = this.parent
        if (this.y == 0) {
            return false
        } else {
            return board.getcell(this.x, this.y - 1)
        }
    }

    right() {
        let board = this.parent
        if (this.x == board.bx - 1) {
            return false
        } else {
            return board.getcell(this.x + 1, this.y)
        }
    }

    bottom() {
        let board = this.parent
        if (this.y == board.by - 1) {
            return false
        } else {
            return board.getcell(this.x, this.y + 1)
        }
    }

    marry(cell:Cell) {
        this.haspair = true
        cell.haspair = true

        this.room.marry(cell.roomno)

        this.pairstep = this.parent.log.step
        cell.pairstep = this.parent.log.step
    }

    pos() {
        return `R${this.x}C${this.y}`
    }

    isNeighbor(cell:Cell) {
        return this.room.isNeighbor(cell.room)
    }

    canOption(cell:Cell, d:Direction){
        return !this.isNeighbor(cell) &&
        !cell.isReserved(d) &&
        this.room.canMarry(cell.roomno)
    }
    hunt(d:Direction, debug=false) {
        let target = this.getTarget(d)
        let pd = d.pairDirection()
        let axis = d.axis

        //blanks: 矢印から調べる場合の確定白マス
        //blanks2: 廊下から調べる場合の確定白マス
        //options: 矢印の先にある、相方候補になるマス
        //pendings: 矢印の先の、中身が決まっていないマス

        let result:HuntResult = {
            blanks: new Cells(),
            blanks2: new Cells(),
            hit: "wall",
            pairallow: new Cell(0,0,this.parent),
            opttop: new Cell(0,0,this.parent),
            options: new Cells(),
            pendings: new Cells(),
            isCorridor: false,
        }

        let isDifferentRoom = false
        let nowroomno = this.roomno
        let iscont = true

        //checkのほう
        for (let cell of target) {
            let canOption = this.canOption(cell, pd)

            if (cell.isAllow) { //矢印にぶつかったら
                if (cell.content.isPair(d)) {
                    result.hit = "pair"
                    result.pairallow = cell
                }
                break
            }

            if (cell.roomno != nowroomno) {//境界線をまたいだら
                nowroomno = cell.roomno
                isDifferentRoom = true
            }
            if (iscont && (cell.isBlank() || !canOption) ) {
                if (!cell.isPending) continue
                result.blanks.push(cell)
                if (isDifferentRoom) {
                    result.blanks2.push(cell)
                }
            } else {
                if (iscont) {
                    result.isCorridor = cell.room.isCorridor(this)[axis] && cell.room.d.isPending
                }
                iscont = false

                if (!cell.isPending) continue

                result.pendings.push(cell)
                if (canOption) {
                    result.options.push(cell)
                }
                
            }
        }
        result.opttop = result.options.getcell(0)

        return result
    }

    research(d:Direction, debug?) {
        let target = this.getTarget(d)
        let pd = d.pairDirection()
        let axis = d.axis

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

            let canOption = this.canOption(cell, pd)
            if (cell.isAllow) {
                if (cell.content.isPair(d) && !this.isNeighbor(cell)) {
                    result.hit = "pair"
                }
                break
            }
            if (cell.roomno != nowroomno) {
                nowroomno = cell.roomno
                cross++
                if (cell.room.isCorridor(this)[axis]) {
                    if (cross == 1) break
                    if (cell.room.d.isFilled) {
                        if (cell.room.d.isPair(d)) {
                            result.hit = "pairroom" // 自分と向き合う廊下なら終了
                        }
                        break
                    }
                }
            }
            if (cell.isPending) {
                result.pendings.push(cell)
            }
            if (iscont && (cell.isBlank() || !canOption)){
                iscont = true
            } else {
                iscont = false
                if (cell.isPending) {
                    result.options.push(cell)
                }
            }
        }

        return result
    }

    researchAll() {
        var dl = dirList
        let r:ResarchResult = {
            data: [],
            mustd: null,
            oned: null,
            onlyd: null,
            isblank: false,
        }
        for (let d of dl) {
            let result = this.research(d)
            if (result.hit == "pair" || result.hit == "pairroom") {
                r.data.push(result.pendings.length ? "able" : "must")
            } else {
                r.data.push(result.options.length ? "able" : "not")
            }
        }

        let m = r.data.filter(d => d == "must").length
        let a = r.data.filter(d => d == "able").length
        let n = r.data.filter(d => d == "not").length

        if (m + a == 1) {
            r.onlyd = dl[r.data.indexOf("must") + r.data.indexOf("able") + 1]
        }
        if (m == 1) {
            r.mustd = dl[r.data.indexOf("must")]
        } else if (a == 1) {
            r.oned = dl[r.data.indexOf("able")]
        }
        if (n == 4) {
            r.isblank = true
        }
        return r
    }

    setdopt(d:Direction) {
        this.dopt = d
    }

    isReserved(d:Direction) {
        let conda = this.dopt.isFilled && !this.dopt.is(d)
        let condb = this.room.isReserved(d)
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

    push(cell:Cell) {
        this.cells.push(cell)
    }

    isSameRoom() {
        if (!this.length) return false
        return this.cells.every((c) => c.roomno == this.cells[0].roomno)
    }

    includes(cell:Cell) {
        return this.indexOf(cell) !== -1
    }

    indexOf(cell:Cell) {
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

    getcell(no:number) {
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
    d:Direction
    allow: Cell | null
    parent: Board
    pairno: number | null
    pairopt: any

    constructor(no:number, parent:Board) {
        this.no = no
        this.cells = []
        this.neighbor = [no]
        this.d = dir.P
        this.allow = null
        this.parent = parent
        this.pairno = null
        this.pairopt = null
    }

    get isfill(){
        return this.allow !== null
    }

    addcell(cell) {
        this.cells.push(cell)
        cell.roomno = this.no
    }

    addNeighbor(room:Room) {
        this.neighbor.push(room.no)
        this.neighbor = this.neighbor.unique()
    }

    getcell(no:number) {
        return this.cells[no]
    }

    getPendingCells() {
        return this.cells.filter((c) => c.isPending)
    }

    fillBlank(exclusion?: Cells) {
        exclusion = exclusion || new Cells()
        for (let cell of this.cells) {
            if(exclusion.includes(cell))continue
            if (cell.isPending) cell.blank()
        }
    }

    isNeighbor(room:Room) {
        return this.neighbor.includes(room.no)
    }

    isCorridor(cell?:Cell) {
        let pending = this.getPendingCells()
        let result = {x:false, y:false}
        if (pending.length == 0) return result

        let x = cell ? cell.x : pending[0].x
        let y = cell ? cell.y : pending[0].y

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
        result.x = isx
        result.y = isy
        return result
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

    setDirection(d:Direction) {
        this.d = d
        for (let cell of this) {
            if (cell.substep == 999) cell.substep = this.parent.log.step
        }
    }

    pendingCells() {
        let cells = new Cells()
        for (let cell of this) {
            if (cell.isPending) cells.push(cell)
        }
        return cells
    }

    setpairno(no:number) {
        this.pairno = no
    }

    isReserved(d:Direction) {
        return this.d.isFilled && !this.d.is(d)
    }

    *[Symbol.iterator]() {
        yield* this.cells
    }
}

class IO {
    mode:string

    constructor(mode){
        this.mode = mode
    }

    decode() {
        if (this.mode == "url") {
            return this.decodeURL()
        } else {
            return this.decodeBorder()
        }
    }

    decodeURL() {
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

        var c = 0
        for (let i = 0; i < btext.length; i++) {
            var n = parseInt(btext[i], 36)
            if (n <= 4) {
                let cell = board.getCellForNum(c)
                let d = [dir.P, dir.U, dir.D, dir.L, dir.R][n]
                cell.allow(d)
                cell.isq = true
                c++
            } else {
                c = c + (n - 4)
            }
        }

        return board
    }

    decodeBorder() {
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
                txt = txt + cell.content.pzpr
            } else {
                txt = txt + ". "
            }

            if (cell.x == board.bx - 1) txt += "\n"
        }
        for (let cell of board.inverted()) {
            if (!cell.isq) {
                txt = txt + cell.content.pzpr
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


class Solver {
    board: Board
    mode: string
    encoder: IO

    constructor() {
        this.board = new Board(1,1)
        this.mode = "url"
        this.encoder = new IO("url")
    }

    analysis() {
        this.board = this.encoder.decode()
        this.board.setup()


        this.solve()
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
        this.board.log.add("開始")
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
        this.board.log.add("終了")

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

        for (let allow of board.allow()) {
            if (allow.haspair) continue

            let d = allow.content

            let result:HuntResult = allow.hunt(d)

            let pd = d.pairDirection()
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
                    board.log.sub(
                        `\t${allow}と${pair}はペア(間に未確定マスがない)`
                    )
                    cnt++
                } else if (pendings.isSameRoom()) {
                    allow.marry(pair)
                    pendings.blank()
                    board.log.sub(
                        `\t${allow}と${pair}はペア(間の未確定マスが1部屋)`
                    )
                    cnt++
                } else if (isCorridor) {
                    opttop.room.setDirection(pd)
                    board.log.sub(`\t${opttop.roomno}番の部屋は${allow}とペア、${pd}向き(廊下)`,opttop.roomno)
                    cnt++
                }
            } else {
                if (options.length == 1) {
                    allow.marry(opttop)
                    opttop.allow(pd)
                    board.log.add(`\t${opttop}が${pd}に確定(${allow}の唯一の相方候補)`)
                    cnt++
                } else if (options.isSameRoom() && opttop.room.d.isPending) {
                    opttop.room.fillBlank(options)
                    opttop.room.setDirection(pd)
                    board.log.sub(`\t${opttop.roomno}番の部屋は${allow}とペア、${pd}向き`,opttop.roomno)
                    cnt++
                } else if (blanks.length > 0) {
                    board.log.sub("\t矢印の先の白マスを" + blanks.length + "個確定")
                    cnt++
                } else if (isCorridor) {
                    opttop.room.setDirection(pd)
                    board.log.sub(`\t${opttop.roomno}番の部屋は${allow}とペア、${pd}向き(廊下)`,opttop.roomno)
                }
            }
        }
        return cnt
    }

    checkTipOfCorridor() {
        let board = this.board
        let cnt = 0

        for (let allow of board.corridorCells()) {
            let d = allow.room.d
            let result = allow.hunt(d)
            let pd = d.pairDirection()

            let options = result.options
            let isCorridor = result.isCorridor
            let opttop = result.opttop

            result.blanks2.blank()

            if (result.hit == "pair") {
                if (!isCorridor) continue

                opttop.room.setDirection(pd)
                allow.room.marry(opttop.roomno)
                board.log.sub(`\t${opttop.roomno}番の部屋は${allow.roomno}とペア、${pd}向き(廊下)`,
                    opttop.roomno,
                    allow.roomno
                )
                cnt++
            } else {
                if (options.length == 1) {
                    opttop.allow(pd)
                    board.log.add(`\t${opttop}が${pd}に確定(${allow.roomno}番の部屋の唯一の相方候補)`, allow.roomno)
                    cnt++
                } else if (options.isSameRoom() && opttop.room.d.isPending) {
                    opttop.room.fillBlank(options)
                    opttop.room.setDirection(pd)
                    allow.room.marry(opttop.roomno)
                    board.log.sub(`\t${opttop.roomno}番の部屋は${allow.roomno}とペア、${pd}向き`,opttop.roomno,allow.roomno)
                    cnt++
                } else if (result.blanks2.length > 0) {
                    board.log.sub("\t廊下の先の白マスを" + result.blanks2.length + "個確定")
                    cnt++
                } else if (isCorridor) {
                    opttop.room.setDirection(pd)
                    allow.room.marry(opttop.roomno)
                    board.log.sub(`\t${opttop.roomno}番の部屋は${allow.roomno}とペア、${pd}向き(廊下)`,opttop.roomno,allow.roomno)
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

                if (room.d.isFilled) {
                    cell.allow(room.d)
                    board.log.add("\t" + cell.pos() + "が" + room.d.name + "に確定(未確定マス1、部屋)")
                    cnt++
                } else if (result.mustd) {
                    cell.allow(result.mustd)
                    board.log.add(
                        "\t" +
                            cell.pos() +
                            "が" +
                            result.mustd +
                            "に確定(未確定マス1、このマスを指す矢印あり)"
                    )
                    cnt++
                } else if (result.oned) {
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

        for (let cell of board) {
            if (!cell.isPending) continue

            let result = cell.researchAll()

            if (result.isblank) {
                cell.blank()
                cnt++
            }
            if (result.mustd) {
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
        board.log.sub("ペアになりうる部屋をごにょごにょします(難しい処理)")
        let option:number[][] = []
        for (let room of board.rooms) {
            if (room.haspair()) continue
            let rs
            if (room.allow) {
                let cell = room.allow
                let r = cell.hunt(cell.content)
                rs = r.options
                if (r.hit == "pair" && r.pairallow.room.canMarry(room.no)) rs.push(r.pairallow)
            } else {
                let ds = room.d ? [room.d] : [dir.U,dir.B,dir.L,dir.R]
                rs = new Cells()
                for (let d of ds) {
                    for (let cell of room.pendingCells()) {
                        let r = cell.hunt(d)
                        rs.concat(r.options)
                        if (r.hit == "pair" && r.pairallow.room.canMarry(room.no))
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
                        board.log.sub("\t" + i + "番と" + n + "番はペア", i, n)
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
			if (room.isfill || room.d.isFilled) continue
			let rs:ResarchResult[] = []
			for (let cell of room.pendingCells()) {
				rs.push(cell.researchAll())
			}
			if (rs.length == 0) {
				continue
			}
			if (rs.every((r) => r.onlyd == rs[0].onlyd) && rs[0].onlyd) {
				room.setDirection(rs[0].onlyd)
				cnt++
				board.log.sub("\t" + room.no + "番の部屋は" + room.d + "向き(全調査)", room.no)
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
            
			let ds = room.d ? [room.d] : dirList
			let rs = new Cells()
			for (let d of ds) {
				for (let cell of room.pendingCells()) {
					let r = cell.hunt(d)
					rs.concat(r.options)
					if (r.hit == "pair") rs.push(r.pairallow)
				}
			}
	
            if (!rs.isSameRoom()) continue
            
            let cell = rs.getcell(0)
            room.marry(cell.roomno)

            if (room.d.isFilled && cell.room.d.isPending) {
                cell.room.setDirection(room.d.pairDirection())
                board.log.sub(`\t${cell.roomno}番は${room.no}番とペア、${room.d.pair}向き`,cell.roomno,room.no)
            } else {
                board.log.sub(`\t${cell.roomno}番は${room.no}番とペア`,cell.roomno,room.no)
            }
            cnt++
			
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
