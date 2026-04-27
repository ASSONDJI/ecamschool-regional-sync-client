tools.Library.Container_mat = function (dao) {
    tools.Library.Container.call(this, dao);
    this._$$indexContent = null;
    this.table;

    this.indexEntities = function (list) {
        return list.reduce((a, v) => ({ ...a, [v.id()]: v }), {});
    }

    this.getList = function (start = 0, end = -1) {
        return this.dao.getList(this.table, start, end);
    }

    this.matriceContent = function () {
        return this.dao.getListTableData(this.table);
    }

    this.getUnique = function (id) {
        if (this._$$indexContent == null) {
            this._$$indexContent = this.indexEntities(this.getList());
        }

        return this._$$indexContent[id];
    }
};