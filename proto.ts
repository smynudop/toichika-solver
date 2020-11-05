declare global {
    interface Array<T> {
        unique(): Array<T>
        remove(x): void
    }
}

Array.prototype.unique = function () {
    return this.filter((c, i) => this.indexOf(c) == i)
}

Array.prototype.remove = function (x) {
    let i = this.indexOf(x)
    if(i>=0)this.splice(i,1)
}

export {}