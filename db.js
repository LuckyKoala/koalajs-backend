const Promise = require('promise')
const r = require('rethinkdbdash')({
    db: 'blog'
})

function DB() {
    //Note: must invoke init first
}

DB.prototype.reset = function() {
    return this.init(true)
}

DB.prototype.init = function(dropIfExists=false) {
    return new Promise((resolve, reject) => this.init0(dropIfExists, resolve, reject))
}

DB.prototype.init0 = function(dropIfExists=false, resolve, reject) {
    if(dropIfExists) {
        r.dbList().contains('blog')
            .do(function(exists) {
                return r.branch(
                    exists,
                    r.dbDrop('blog'),
                    'database blog not exists yet'
                )
            }).run()
            .then(ret => r.dbCreate('blog'))
            .then(ret => r.tableCreate('posts'))
            .then(resolve, reject)
    } else {
        r.dbList().contains('blog')
            .do(function(exists) {
                return r.branch(
                    exists,
                    'database blog exists',
                    r.dbCreate("blog")
                )
            }).run()
            .then(ret => r.tableList().contains('posts')
                .do(function(exists) {
                    return r.branch(
                        exists,
                        'table posts exists',
                        r.tableCreate("posts")
                    )
                }).run())
            .then(resolve, reject)
    }
}

DB.prototype.list = function(callback) {
    const promise = r.table('posts').run()
    if(arguments.length==0) {
        return promise
    } else {
        promise.then(result => callback(false, result), callback)
    }
}

DB.prototype.new = function(data, callback) {
    const promise = r.table('posts').insert({
        'title': data.title,
        'summary': data.summary || 'No summary',
        'content': data.content
    }).run()
    //TODO handle no enough argument
    if(arguments.length<=1) {
        return new Promise((resolve, reject) => {
            promise.then(result => resolve(result['generated_keys'][0]), reject)
        })
    } else {
        promise.then(result => callback(false, result['generated_keys'][0]), callback)
    }
}

DB.prototype.find = function(key, callback) {
    const promise = r.table("posts").get(key).run()
    if(arguments.length<=1) {
        return promise
    } else {
        promise.then(result => callback(false, result), callback)
    }
}

DB.prototype.delete = function(key, callback) {
    const promise = r.table("posts").get(key).delete().run()
    if(arguments.length<=1) {
        return promise
    } else {
        promise.then(result => {
            if(result["deleted"]==1) callback(false, result)
            else callback('deleted failed', result)
        }, callback)
    }
}

DB.prototype.update = function(key, data, callback) {
    //TODO Only update changed data
    /*
    let newData = {}
    if(title) newData.title = title
    if(content) newData.content = content
    if(summary) newData.summary = summary
    */

    const promise = r.table("posts").get(key)
        .update({
            'title': data.title,
            'summary': data.summary,
            'content': data.content
        }).run()
    if(arguments.length<=2) {
        return promise
    } else {
        promise.then(result => {
            if(result["replaced"]==3) callback(false, result)
            else callback('replaced failed', result)
        }, callback)
    }
}


module.exports = DB;
