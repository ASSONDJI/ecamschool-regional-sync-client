tools.Library.Container_mat = function (dao) {
    tools.Library.Container.call(this, dao);
    this._$$indexContent = null;
    this._indexDirty = true;    // ★ NOUVEAU : Flag pour indiquer que l'index doit être reconstruit
    this.table;

    // ----------------------------------------------------------
    // indexEntities()
    // Crée un index { id: entity } à partir d'une liste d'entités
    // ----------------------------------------------------------
    this.indexEntities = function (list) {
        return list.reduce((a, v) => ({ ...a, [v.id()]: v }), {});
    }

    // ----------------------------------------------------------
    // getList()
    // Retourne la liste des entités de la table
    // ----------------------------------------------------------
    this.getList = function (start = 0, end = -1) {
        return this.dao.getList(this.table, start, end);
    }

    // ----------------------------------------------------------
    // matriceContent()
    // Retourne le contenu de la matrice
    // ----------------------------------------------------------
    this.matriceContent = function () {
        return this.dao.getListTableData(this.table);
    }

    // ----------------------------------------------------------
    // getUnique()
    // Récupère une entité par son ID
    // ★ MODIFICATION : Utilise _indexDirty pour reconstruire l'index
    //                  si la matrice a été modifiée.
    // ----------------------------------------------------------
    this.getUnique = function (id) {
        // Si l'index est "sale" ou null, le reconstruire
        if (this._$$indexContent == null || this._indexDirty) {
            this._$$indexContent = this.indexEntities(this.getList());
            this._indexDirty = false;
            console.log("[Container_mat] Index reconstruit pour la table :", this.table);
        }
        return this._$$indexContent[id];
    }

    // ----------------------------------------------------------
    // invalidateIndex()
    // ★ NOUVEAU : Marque l'index comme "sale" pour qu'il soit
    //             reconstruit lors du prochain getUnique().
    //             À appeler après chaque mise à jour de la matrice.
    // ----------------------------------------------------------
    this.invalidateIndex = function () {
        this._indexDirty = true;
        console.log("[Container_mat] Index invalidé pour la table :", this.table);
    }

    // ----------------------------------------------------------
    // refreshIndex()
    // ★ NOUVEAU : Force la reconstruction immédiate de l'index.
    // ----------------------------------------------------------
    this.refreshIndex = function () {
        this._$$indexContent = this.indexEntities(this.getList());
        this._indexDirty = false;
        console.log("[Container_mat] Index rafraîchi pour la table :", this.table);
        return this._$$indexContent;
    }
};