let tools = {
    Applications: {
        Frontend: {
            Config: {
                routes: [
                    { url: "/s.admin/school/treat/list-matching", module: "Rh", action: "listMatching" },
                    { url: "(.*)", module: "Rh", action: "index" }
                ],
                app: [
                    { "ontoConcept": "/Web/js/fs-js/onto_entities.js" }
                ]
            },
            Modules: {
            },
            FrontendApplication: function () {
                tools.Library.Application.call(this);
                this.name = "Frontend";

                // this.run = function () {
                //     tools.Library.Application.prototype.run.call(this);
                // }
            }
        }
    },
    Library: {
        Actualizers: {
            _$$APP: null,
            Managers: function (app) {
                tools.Library.AppComponent.call(this, app);
                this.dataLoad = null;

                if (app == null) {
                    this.app = tools.Library.Actualizers._$$APP;
                } else {
                    tools.Library.Actualizers._$$APP = app;
                }

                this.actualize = function (action) {
                    if (this.dataLoad == null) {
                        this.dataLoad = this.getApp().moduleActionLoadData();
                    }
                    // console.log(this.dataLoad);
                    this.dataLoad[action](this.getApp().getHttpRequest());
                }
            }
        },
        ArrayUtility: {
            filterUniques: function (list) {
                let result = {};
                // console.log(list);
                for (let i = 0; i < list.length; i++) {
                    const elt = list[i];
                    // if (!result.includes(elt)) {
                    //     result.unshift(elt);
                    // }
                    result[elt.trim()] = 1;
                }

                return Object.keys(result);
            },

            neutralOP: function (op) {
                if (['+', '-'].includes(op)) {
                    return 0;
                }
                if (['/', '*'].includes(op)) {
                    return 1;
                }
                return " ";
            },
            acc: function (facc, list, op = '+') {
                let el = list[0];
                if (op == "id") return el;

                let result = facc(el);
                for (let i = 1; i < list.length; i++) {
                    el = list[i];
                    // if (!el) el = tools.Library.ArrayUtility.neutralOP(op);
                    let b = facc(el);

                    switch (op) {
                        case '+':
                            result += b;
                            break;
                        case "-":
                            result -= b;
                            break;
                        case "*":
                            result *= b;
                            break;
                        case "/":
                            result /= b;
                            break;
                        default:
                            result = result[op](b);
                    }
                }

                return result;
            },
            arrayRestrict: function (arrIn, arr) {
                let result = [];
                for (let i = 0; i < arrIn.length; i++) {
                    if (arr[i] != undefined && arrIn[i] == arr[i]) {
                        result[i] = arrIn[i];
                    }
                }
                return result;
            },

            arrayIntersect: function (arr1, arr2) {
                let result = [];
                if (arr1.length < arr2.length) {
                    return tools.Library.ArrayUtility.arrayRestrict(arr1, arr2);
                }
                return tools.Library.ArrayUtility.arrayRestrict(arr2, arr1);
            }
        },
        Entity: function (data) {
            this.data = data;

            this.add = function (entity) {
                return new tools.Library.Entity;
            }

            this.id = function () {
                return this._getDataValue("id");
            }

            this.setId = function (id) {
                return this._setDataValue("id", id);
            }

            this.dateModif = function () {
                return this._getDataValue("dateModif");
            }

            this.dateInsert = function () {
                return this._getDataValue("dateInsert");
            }

            this._getDataValue = function (attrib) {
                return this.data[attrib];
            }

            this._setDataValue = function (attrib, valeur) {
                this.data[attrib] = valeur;
            }

            this.addDescription = function (attrib, valeur) {
                this._setDataValue(attrib, valeur);
            }

            this.getDescription = function (attrib) {
                return this._getDataValue(attrib);
            }

            this.existDescription = function (attrib) {
                return this.data[attrib] == undefined;
            }

            this.getData = function () {
                return JSON.parse(JSON.stringify(this.data));
            }

            this.getDataTypes = function () {
                const data = this.getData();
                let result = {};

                for (const attrib in data) {

                    if (Object.hasOwnProperty.call(data, attrib)) {
                        const element = this[attrib]();
                        result[attrib] = typeof element;
                    }

                }

                return result;
            }

            this.getPropertiesNames = function () {
                const data = this.getData();
                let result = [];

                for (const attrib in data) {
                    if (Object.hasOwnProperty.call(data, attrib)) {
                        result.push(attrib);
                    }
                }

                return result;
            }

            this.getPropertiesValues = function () {
                const data = this.getData();
                let result = [];

                for (const attrib in data) {
                    if (Object.hasOwnProperty.call(data, attrib)) {
                        result.push(data[attrib]);
                    }
                }

                return result;
            }

            this.getPropertiesNamesValues = function (names) {
                let result = [];

                for (let index = 0; index < names.length; index++) {
                    const name = names[index];
                    result.push(this._getDataValue(name));
                }

                return result;
            }
        },
        Managers: function (api, dao) {
            this.api = api;
            this.dao = dao;

            this.getManagerOf = function (model) {
                const namespace = tools.AppLib.Models;
                return new namespace[model + "Managers_" + this.api](this.api, this.dao);
            }
        },
        Container: function (dao) {
            this.dao = dao;

            this.getContainerOf = function (model) {
                let namespace = tools.AppLib.Container;
                // console.log(model);
                return new namespace[model + "Container"](this.dao);
            }
        },
        Managers_api: function (api, dao) {
            tools.Library.Managers.call(this, api, dao);

            this.save = function (uri, data, httpRequest) {
            }

            this.addListenerRequest = function (httpRequest) {
            }

            this.getUnique = function (id) {
            }
        },
        Managers_AJAX: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);
            this.table;
            this.listenerHttpRequest = [];

            this._requestFetchAll = function (request, httpRequest, attribRequest, dataFilter, dataKeysCols = []) {
                if (this.dao.uriExist(request)) {

                    httpRequest.setAttribute(attribRequest, this.dao.getElementsIndexUri(this.table, request));
                    httpRequest.chainActivate();

                } else {

                    this._requestFetchAllAJAX(request, httpRequest, attribRequest, dataFilter, dataKeysCols);

                }
            }

            this._requestFetchAllAJAX = function (request, httpRequest, attribRequest, dataFilter, dataKeysCols = []) {
                this.listenerHttpRequest[attribRequest] = httpRequest;
                // console.log(this.table);
                let
                    context = this,
                    table = this.table;
                $.ajax({
                    type: "POST",
                    url: request,
                    data: dataFilter,
                    dataType: "JSON",
                    // success: this._loadData
                    success: function (reponse) {
                        // let result = [];
                        console.log(table);
                        console.log(reponse.length);
                        // console.log(reponse);
                        context.dao.updateTable(request, table, reponse, dataKeysCols);
                        // context.dao.updateTable(request, table, JSON.parse(reponse["content"]));
                        // for (const pos in reponse) {
                        //     if (Object.hasOwnProperty.call(reponse, pos)) {
                        //         const element = reponse[pos];
                        //         if (element != null) {
                        //             let entityNP = new tools.AppLib.Entities[table](element);
                        //             result.push(entityNP);
                        //         }
                        //     }
                        // }
                        // httpRequest.setAttribute(attribRequest, result);
                        // console.log(context.dao.getElementsIndexUri(table, request));
                        httpRequest.setAttribute(attribRequest, context.dao.getElementsIndexUri(table, request));
                        httpRequest.chainActivate();
                    },
                    error: function (requestH, error) {
                        console.log(request);
                        console.log(arguments);
                        alert(" Can't do because: " + error);
                    }
                });
            }

            this.save = function (uri, data, httpRequest) {
                // console.log(JSON.stringify(data));
                if (uri == null) {
                    uri = '/save/' + this.getTable().toLowerCase();
                }
                $.ajax({
                    type: "POST",
                    url: uri,
                    data: { "dataJSON": JSON.stringify(data) },
                    success: function (reponse) {
                        // console.log(reponse);
                        // httpRequest.chainActivate();
                    }
                });
            }

            this._loadData = function (data) {
                for (const attribRequest in this.listenerHttpRequest) {
                    if (Object.hasOwnProperty.call(this.listenerHttpRequest, attribRequest)) {
                        const httpRequest = this.listenerHttpRequest[attribRequest];

                        httpRequest.chainActivate();
                    }
                }
            }

            this.addListenerRequest = function (httpRequest) {
                this.listenerHttpRequest.push(httpRequest);
            }

            this.getTable = function () {
                return this.table;
            }

            this.getContainer = function () {
                return this.dao.getContainer().getContainerOf(this.table);
            }

            this.getUnique = function (id) {
                // console.log(id);
                // console.log(this.dao.getElementRow(this.table, id));
                let elements = this.dao.getElementRow(this.table, id);
                return new tools.AppLib.Entities[this.table](elements);
            }

            this.matriceContent = function () {
                // console.log(id);
                return this.dao.getListTableData(this.table);
            }
        },
        Managers_InDB: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);

            this.save = function (uri, data, httpRequest) {
            }

            this.addListenerRequest = function (httpRequest) {
            }

            this.getUnique = function (id) {
            }
        },
        _$$DAOContainerData: {
            "listTableData": {},
            "tableHeader": {}
        },
        AppComponent: function (app) {
            this.app = app;

            this.getApp = function () {
                return this.app;
            }
        },
        HTTPRequest: function (app) {
            tools.Library.AppComponent.call(this, app);
            this.dataActivate = [];
            this.attributes = [];
            // this._nbre_execute = 0;
            // this._nbre_activate = 0;
            // this._nbre_activate_no = 0;
            this.dataActivate = 0;
            this._getNextAction = function () {
                let dataActivateTMP = [], element = null, add = false;
                for (const key in this.dataActivate) {
                    const elementTMP = this.dataActivate[key];
                    if (Object.hasOwnProperty.call(this.dataActivate, key)) {
                        // console.log("inside");
                        if (add) {
                            dataActivateTMP.push(elementTMP);
                        } else {
                            element = elementTMP;
                            add = true;
                        }
                    }
                }
                if (add) {
                    this.dataActivate = dataActivateTMP;
                } else {
                    this.dataActivate = null;
                }
                return element;
            }

            this.chainActivate = function () {
                if (this.dataActivate != null) {
                    let element = this._getNextAction();
                    if (element != null) {
                        element(this);
                    } else {
                        this.chainActivate();
                    }
                } else {
                    let controller = this.app.getCurrentController();
                    controller.execute();
                    if (typeof noty === 'function') {
                        noty({
                            text: "Vous pouvez travailler !!!",
                            layout: 'center',
                            type: 'alert',
                            animateOpen: {
                                opacity: 'show',
                            },
                        });
                    }
                }
            }

            this.requestURI = function () {
                return window.location.pathname;
            }

            this.setDataActivate = function (dataActivate) {
                this.dataActivate = dataActivate;
            }

            this.setAttribute = function (name, value) {
                this.attributes[name] = value;
            }

            this.setAttributes = function (vars) {
                this.attributes = vars;
            }

            this.getAttribute = function (name) {
                // console.log(this.attributes);
                return this.attributes[name];
            }

            this.getAttributes = function () {
                return this.attributes
            }
        },
        Application: function () {
            this.httpRequest = new tools.Library.HTTPRequest(this);
            this.name = "";
            this.currentController = null;
            this.currentRoute = null;
            this.actualizerManager = new tools.Library.Actualizers.Managers(this);

            this.getCurrentController = function () {
                return this.currentController;
            }

            this.getCurrentRoute = function () {
                return this.currentRoute;
            }

            this.getName = function () {
                return this.name;
            }

            this.moduleActionLoadData = function () {
                // console.log(this.currentRoute);
                let
                    namespace = tools.Applications.Frontend.Modules[this.currentRoute.getModule()].DataLoad,
                    y = Object.assign([], namespace["Action" + this.currentRoute.getAction().charAt(0).toUpperCase() + this.currentRoute.getAction().slice(1)]);
                // alert();
                return y;
            }

            this.getInitRouter = function (contextURI = "") {
                let router = new tools.Library.Router();
                let routes = tools.Applications[this.name].Config.routes;

                for (let i = 0; i < routes.length; i++) {
                    const route = routes[i];
                    let vars = [];
                    if (route["vars"] !== undefined) {
                        // console.log(route["vars"]);
                        vars = route["vars"].split(",");
                    }

                    router.addRoute(new tools.Library.Route(
                        route["url"],
                        route["module"],
                        route["action"],
                        vars
                    ));
                }
                // console.log(router);
                return router;
            }

            this.getMatchRouteController = function (router, url) {
                let matchedRoute = router.getRoute(url);
                // console.log(matchedRoute);
                this.currentRoute = matchedRoute;
                this.httpRequest.setAttributes(matchedRoute.getVars());
                // console.log(tools.Applications[this.name].Modules[matchedRoute.getModule()]);
                let classController = tools.Applications[this.name].Modules[matchedRoute.getModule()][matchedRoute.getModule() + "Controller"];
                // console.log(classController);
                return new classController(this, matchedRoute.getModule(), matchedRoute.getAction());
            }

            this.getController = function () {
                let router = this.getInitRouter();
                // console.log(this.httpRequest.requestURI());
                this.currentController = this.getMatchRouteController(router, this.httpRequest.requestURI());

                return this.currentController;
            }

            this.getHttpRequest = function () {
                return this.httpRequest;
            }

            this.getActualizerManager = function () {
                return this.actualizerManager;
            }

            this.run = function () {
                if (typeof noty === 'function') {
                    noty({
                        text: "Patientez un moment s'il vous plait !!!",
                        layout: 'center',
                        type: 'alert',
                        animateOpen: {
                            opacity: 'show',
                        },
                    });
                }
                // console.log("run");
                let controller = this.getController();
                this.httpRequest.setDataActivate(this.moduleActionLoadData());
                // let controller = new tools.Applications.Frontend.Modules.Bulletins.BulletinsController(this, "Bulletin", "index");
                // controller.execute();
                // this.currentController = controller;
                this.httpRequest.chainActivate();
            }
            // this.run();
        },
        BackController: function (app, module, action) {
            tools.Library.AppComponent.call(this, app);

            this.managers = new tools.Library.Managers("AJAX", new tools.Library.DAOContainer());
            this.managersInDB = new tools.Library.Managers("InDB", null);
            // this.container = new tools.Library.Container(dao);

            this.page = new tools.Library.Page(app);
            this.module = module;
            this.action = action;
            // console.log(this.action);
            this.templates = tools.Applications[app.name].Modules[module].Template;

            this.execute = function () {
                // this.executeIndex(this.app.httpRequest);
                // console.log(this.action);
                this["execute" + this.action.charAt(0).toUpperCase() + this.action.slice(1)](this.app.httpRequest);
            }

            this.getManagers = function () {
                return this.managers;
            }

            this.getPage = function () {
                return this.page;
            }
        },
        Route: function (url, module, action, varsNames, vars = []) {
            this.url = url;
            this.module = module;
            this.action = action;
            this.varsNames = varsNames;
            this.vars = vars;

            this.match = function (url) {
                let regex = new RegExp("^" + this.url + "$");
                if (regex.test(url)) {
                    // console.log(regex.exec(url));
                    return regex.exec(url);
                }
                return false;
            }

            this.hasVars = function () {
                // console.log(this.varsNames);
                return this.varsNames.length > 0;
            }

            this.getUrl = function () {
                return this.url;
            }

            this.getModule = function () {
                return this.module;
            }

            this.getAction = function () {
                return this.action;
            }

            this.getVars = function () {
                return this.vars;
            }

            this.setVars = function (vars) {
                this.vars = vars;
            }

            this.getVarsNames = function () {
                return this.varsNames;
            }
        },
        Router: function () {
            this.routes = new Map();

            this.addRoute = function (route) {
                if (!this.routes.has(route.getUrl())) {
                    this.routes.set(route.getUrl(), route);
                }
            }

            this.getRoute = function (url) {
                for (const route of this.routes.values()) {
                    // console.log(route);
                    let varsValues = true;
                    if ((varsValues = route.match(url)) !== false) {
                        // console.log(route.hasVars());
                        if (route.hasVars()) {
                            var
                                varsNames = route.getVarsNames(),
                                listVars = {};

                            for (const key in varsValues) {
                                if (Object.hasOwnProperty.call(varsValues, key)) {
                                    const match = varsValues[key];
                                    let num = parseInt(key);
                                    if (!isNaN(num) && key !== 0 && varsNames[key - 1] !== undefined) {
                                        listVars[varsNames[key - 1]] = match;
                                    }
                                }
                            }

                            // console.log(listVars);
                            route.setVars(listVars);
                        }
                        return route;
                    }
                }
            }
        },
        Page: function (app) {
            tools.Library.AppComponent.call(this, app);
            this.vars = {};

            this.addVar = function (name, val) {
                this.vars[name] = val;
            }

            this._applyContent = function (template, contents) {
                // let firstChild = template.find(":first-child");
                for (const key in contents) {
                    if (Object.hasOwnProperty.call(contents, key)) {
                        const content = contents[key];

                        content.attr("derive-template", content.attr("template"));
                        content.removeAttr("template");
                        content.show();

                        content.appendTo(template);
                    }
                }

            }

            this._initDuplicateTemplate = function (template, duplicateName) {
                template.parent().find('[derive-template="' + duplicateName + '"]').remove();
                template.parent().find('[template="' + duplicateName + '"]').hide();
            }

            this.formatTableheader = function (list) {
                let result = "<tr>";

                for (let i = 0; i < list.length; i++) {
                    result += "<td>" + list[i] + "</td>";
                }

                result += "</tr>";
                return result;
            }

            this.views = function () {
                // this.currentRoute = matchedRoute;
                this.app.httpRequest.setAttributes(this.app.getCurrentRoute().getVars());
                // console.log(tools.Applications[this.name].Modules[matchedRoute.getModule()]);
                return tools.Applications[this.app.getName()].Modules[this.app.getCurrentRoute().getModule()]["Views"];
                // console.log(classController);
            }
        },
        Knowledge: {
            MatriceLearn: function (matrice, knowledge) {
                this.ligneFirstCopy = [];
                this.matrice = matrice;
                this.knowledge = knowledge;
                // console.log(this.ligneFirstCopy);:

                this.dynamicApplyColonnesMapCellIdentify = function (pseudoColsNames, mapCelldentifyCol) {
                    for (const colName in pseudoColsNames) {
                        if (Object.hasOwnProperty.call(pseudoColsNames, colName)) {
                            const pseudoCol = pseudoColsNames[colName];

                            let lignesSelected = this.matrice.getLignes();
                            let colElements = this.matrice.getElementsColonne(colName);
                            // console.log(colElements);
                            // var
                            //     indexCol = this.getColIndex(colName),
                            //     indexHight = this._getHightIndex(hightName),
                            for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                                const
                                    elt = colElements[indexLigne],
                                    eltM = mapCelldentifyCol(elt, pseudoCol);

                                this.setElement(eltM, colName, this.matrice.getLignes()[indexLigne]);
                            }
                        }
                    }

                }

                this.mapColsByDerivingKnowledgePlace1 = function (colsNames, entity) {
                    const map = this.knowledge.buildMapForEntity(entity);
                    this.matrice.applyColonnesMapCellIdentify([colsNames[0]], map);

                    // console.log(colsNames);
                    this.mapColsByDerivingKnowledgeStatic1(colsNames, entity);
                }

                this.mapColsByDerivingKnowledgePlace2 = function (colsNames, entity) {
                    this.colonnesFirstCopy = matrice.getElementsColonne(colsNames[0]);
                    // const map = this.knowledge.buildMapForEntity(entity);
                    // console.log(this.colonnesFirstCopy);

                    this.mapColsByDerivingKnowledgePlace1(colsNames.slice(0, 2), entity);
                    this.mapColsByDerivingKnowledgeStatic1(colsNames, entity);
                }

                this.mapColsByDerivingKnowledgeStatic1 = function (colsNames, entity, minStatic = 1) {
                    const
                        lignesSelected = this.matrice.getLignes(),
                        colonnesElements = {};

                    for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                        const
                            derives = [],
                            map = this.knowledge.buildMapForEntityWithHistory(entity, derives);

                        derives.push({
                            "context": colsNames[0],
                            "meaning": this.matrice.getElement(colsNames[0], lignesSelected[indexLigne]),
                            "obs": this.colonnesFirstCopy[indexLigne]
                        });

                        // console.log(this.ligneFirstCopy);
                        for (let i = minStatic; i < colsNames.length; i++) {
                            const colName = colsNames[i];
                            // let indexCol = this.matrice.getColIndex(colName);
                            let colElements = colonnesElements[colName];
                            if (colElements == undefined) {
                                colElements = this.matrice.getElementsColonne(colName);
                            }
                            const
                                elt = colElements[indexLigne],
                                eltM = map(elt, colName);

                            if (eltM) {
                                this.matrice.setElement(eltM, colName, this.matrice.getLignes()[indexLigne]);
                            }

                            // console.log(derives);
                            derives.push({
                                "context": colName,
                                "meaning": eltM,
                                "obs": elt
                            });
                            // console.log(derives);
                            // console.log(this.ligneFirstCopy);
                        }

                        // console.log("derives");
                        // this.ligneFirstCopy = matrice.getElementsLigne(matrice.getLignes()[indexLigne + 1]);
                        // console.log(matrice.getLignes());
                        // console.log(this.ligneFirstCopy);
                    }

                }

                this.derivingColsByKnowledge = function (colsNames, entity) {
                    const
                        lignesSelected = this.matrice.getLignes(),
                        colonnesSelected = this.matrice.getColonnes();

                    // this.colonnesFirstCopy = matrice.getElementsColonne(colsNames[0]);
                    for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                        const
                            derives = [],
                            map = this.knowledge.buildMapForEntityWithHistory(entity, derives);

                        // console.log(this.ligneFirstCopy);
                        for (let i = 0; i < colsNames.length; i++) {
                            const colName = colsNames[i];
                            // let indexCol = this.matrice.getColIndex(colName);
                            for (let j = 0; j < colonnesSelected.length; j++) {
                                const colNameS = colonnesSelected[j];

                                const
                                    elt = this.matrice.getElement(colNameS, lignesSelected[indexLigne]),
                                    eltM = map(elt, colName);

                                if (eltM) {
                                    this.matrice.setElement(eltM, colName, lignesSelected[indexLigne]);
                                    // console.log(derives);
                                    derives.push({
                                        "context": colName,
                                        "meaning": eltM,
                                        "obs": elt
                                    });
                                    // console.log(derives);
                                }
                                // console.log(elt);
                                // console.log(colNameS);

                            }
                            // console.log(colName);
                            // console.log("derives");
                            // console.log(derives);
                            // console.log(this.ligneFirstCopy);
                        }
                        // console.log("derives ligne");
                        // this.ligneFirstCopy = matrice.getElementsLigne(matrice.getLignes()[indexLigne + 1]);
                        // console.log(matrice.getLignes());
                        // console.log(this.ligneFirstCopy);
                    }

                }

                this.mapColByKnowledge = function (colName, map) {
                    this.matrice.applyColonneMapCell(colName, map);
                }

                this.getMatrice = function () {
                    return this.matrice;
                }

                this.getKnowledge = function () {
                    return this.knowledge;
                }
            },

            AboutAttrib: function (manager, contextEntity, attrib) {
                this.manager = manager;
                this.context = contextEntity;
                this.attrib = attrib;

                this.meaning = function (observation) {
                    if (this.context[this.attrib] == null) {
                        return observation;
                    }

                    // console.log(this.context[this.attrib]);
                    for (const mean in this.context[this.attrib]) {
                        if (Object.hasOwnProperty.call(this.context[this.attrib], mean)) {
                            const observations = this.context[this.attrib][mean];
                            // console.log(observation);
                            // console.log(observations);
                            // console.log(observationsfdfdfefqf);
                            // if (observations.length == 0) {
                            if (this.manager.removeWhiteSpace(mean).toLowerCase() == this.manager.removeWhiteSpace(observation).toLowerCase()) {
                                return mean;
                            }
                            // } 
                            else {
                                for (let i = 0; i < observations.length; i++) {
                                    const obs = observations[i];
                                    if (this.manager.removeWhiteSpace(obs).toLowerCase() == this.manager.removeWhiteSpace(observation).toLowerCase()) {
                                        return mean;
                                    }
                                }
                            }
                        }
                    }

                    return null;
                }

                this.extendsContext = function () {
                    if (this.context[this.attrib] != null) {
                        for (const mean in this.context[this.attrib]) {
                            if (Object.hasOwnProperty.call(this.context[this.attrib], mean)) {
                                const observations = this.context[this.attrib][mean];

                                for (let i = 0; i < observations.length; i++) {
                                    const obs = observations[i].replace(/[^\w\s]/gi, " ");
                                    let obsSegments = obs.split(" ");

                                    this.context[this.attrib][mean] = observations[i].concat(obsSegments);
                                }
                            }

                        }
                    }

                }
            },

            AboutEntity: function (manager, contextPackage, entity) {
                this.manager = manager;
                this.context = contextPackage;
                this.entity = entity;
                this.contextObs = null;
                // [{context, meaning, obs}]
                this.contextObsList = [];

                this.setContextObservation = function (context) {
                    this.contextObs = context;
                    return this;
                }

                this.setContextObsList = function (context) {
                    this.contextObsList = context;
                    return this;
                }

                this.addContextObsList = function (context) {
                    this.contextObsList.push(context);
                    return this;
                }

                this.meaning = function (observation) {
                    if (this.contextObsList) {
                        return this.meaningObsInContextListObs(observation, this.contextObs);
                    }

                    return this.meaningContextObs(observation);
                }

                this.meaningContextObs = function (observation) {
                    let
                        context = this.context[this.entity],
                        meanings = {}, lastContext = null;

                    for (const attrib in context) {
                        if (Object.hasOwnProperty.call(context, attrib)) {
                            const
                                // attribValues = context[attrib],
                                meaning = this.meaningObs(observation, attrib, attrib);

                            if (meaning != null) {
                                meanings[attrib] = meaning;
                                lastContext = attrib;
                            }
                        }
                    }
                    // console.log(observation);
                    // console.log(meanings);
                    // console.log(meanings[this.contextObs]);
                    // console.log("meanings");
                    return meanings[this.contextObs] == undefined ? meanings[lastContext] : meanings[this.contextObs];
                }

                this.meaningObsInContextListObs = function (observation, contextObs) {
                    // console.log(contextObs);

                    for (let i = 0; i < this.contextObsList.length; i++) {
                        const obsList = this.contextObsList[i];
                        let
                            obs = this.meaningObs(obsList.obs, contextObs, contextObs),
                            meaningObs = this.meaningObs(obsList.meaning, contextObs, contextObs);

                        if (meaningObs || obs) {
                            return meaningObs != null ? meaningObs : obs;
                        }
                    }

                    return this.meaningObs(observation, contextObs, contextObs);
                }

                this.meaningObs = function (observation, attrib, contextObs) {
                    if (attrib != contextObs) {
                        return null;
                    }

                    const
                        // attribValues = context[attrib],
                        aboutAttrib = this.manager.aboutAttrib(this.entity, attrib),
                        meaning = aboutAttrib.meaning(observation);

                    // console.log(observation);
                    // console.log(meanings);
                    return meaning;
                }

                this.extendsContext = function () {

                }
            },

            Managers: function (location) {
                this.graph = {};
                this.location = location;
                this.loadNativeGraph = function (observer, env) {
                    let
                        callback_env = env,
                        context = this;
                    // console.log(traitment);

                    $.ajax({
                        url: this.location,
                        dataType: "JSON",
                        success: function (data) {
                            context._buildGraph(data);
                            // console.log(traitment);
                            observer.knowledgeApplyObserver(context, callback_env);
                        }
                    });
                }

                this._buildGraph = function (data) {
                    this.graph = data;
                }

                this.removeWhiteSpace = function (word) {
                    let result = "";

                    for (let i = 0; i < word.length; i++) {
                        const letter = word[i];
                        if (letter) {
                            result += letter;
                        }
                    }

                    return result;
                }

                this.aboutAttrib = function (entity, attrib) {
                    // console.log(entity);
                    // console.log(this.graph);
                    return new tools.Library.Knowledge.AboutAttrib(this, this.graph["Entities"][entity], attrib);
                }

                this.aboutEntity = function (entity) {
                    // console.log(entity);
                    // console.log(this.graph);
                    return new tools.Library.Knowledge.AboutEntity(this, this.graph["Entities"], entity);
                }

                this.properObservation = function (obs) {
                    if (obs) {
                        // console.log(obs.replace(/[^\w\s]/gi, "").replace(" ", "").trim().toLowerCase());
                        return obs.replace(/[^\w\s]/gi, "").replace(" ", "").trim().toLowerCase();
                    }
                    return obs;
                }

                this.containProperObservationInList = function (obs, listObs, lengthSimilarity = 3) {
                    // console.log("check");
                    for (const pos in listObs) {
                        if (Object.hasOwnProperty.call(listObs, pos)) {
                            const lObs = listObs[pos];
                            if (this.levenshteinDistance(obs, lObs) < lengthSimilarity + 1) {
                                // console.log(obs);
                                // console.log(lObs);
                                // console.log(this.levenshteinDistance(obs, lObs));
                                return lObs;
                            }
                        }
                    }

                    return false;
                }

                this.levenshteinDistance = function (at, bt) {
                    let a = at.toLowerCase(), b = bt.toLowerCase();
                    if (at.length < bt.length) {
                        a = bt.toLowerCase();
                        b = at.toLowerCase();
                    }

                    const aLimit = a.length + 1;
                    const bLimit = b.length + 1;
                    const distance = Array(aLimit);

                    for (let i = 0; i < aLimit; ++i) {
                        distance[i] = Array(aLimit).fill(0);
                    }

                    for (let j = 0; j < bLimit; ++j) {
                        distance[0][j] = j;
                    }

                    for (let i = 1; i < aLimit; ++i) {
                        for (let j = 1; j < bLimit; ++j) {
                            const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
                            distance[i][j] = Math.min(
                                distance[i - 1][j] + 1,
                                distance[i][j - 1] + 1,
                                distance[i - 1][j - 1] + substitutionCost
                            );
                        }
                    }
                    // console.log(distance[a.length][b.length]);
                    // console.log(levenshteinqssqsdDistance(obs, lObs));
                    return distance[a.length][b.length];
                }

                this.aboutAttibUnknowEntity = function (attrib) {

                }

                this.aboutAttibUnknowEntity = function () {

                }

                this.getMatriceLearn = function (matrice) {
                    return new tools.Library.Knowledge.MatriceLearn(matrice, this);
                }

                this.buildMapForAttrib = function (entity, attrib) {
                    let about = this.aboutAttrib(entity, attrib);
                    return function (val) {
                        // console.log(val);
                        // console.log(about.meaning(val));
                        return about.meaning(val);
                    }
                }

                this.buildMapForEntity = function (entity) {
                    let about = this.aboutEntity(entity);
                    return function (val, context) {
                        // console.log(entity);
                        // console.log(val);
                        // console.log(context);
                        return about.setContextObservation(context).meaning(val);
                    }
                }

                this.buildMapForEntityWithHistory = function (entity, contextObsList) {
                    let about = this.aboutEntity(entity);

                    return function (val, context) {
                        // console.log(val);
                        // console.log(context);
                        // console.log(contextObsList);
                        if (val == null || val == undefined) {
                            return val;
                        }

                        return about.setContextObsList(contextObsList)
                            .setContextObservation(context).meaning(val.trim());
                    }
                }

                this.buildMapProper = function (lengthSimilarity = 3) {
                    const
                        context = this,
                        observations = {};

                    return function (val) {
                        let
                            valProper = context.properObservation(val),
                            valProperChech = context.containProperObservationInList(valProper, Object.keys(observations), lengthSimilarity);
                        // console.log("val");
                        if (valProperChech === false) {
                            // console.log("val");
                            // console.log(observations);
                            valProperChech = valProper;
                            observations[valProper] = val;
                        }
                        // console.log(val);
                        // console.log(observations[valProperChech]);
                        // console.log(observations[valProper]);
                        return observations[valProperChech];
                    }
                }

                this.buildProperDate = function () {
                    const context = this;

                    return function (val) {
                        // console.log("val");
                        if (val !== null) {
                            let
                                valProper = context.removeWhiteSpace(val).replace(/[^\w\s]/gi, "/"),
                                valDate = Date.parse(valProper);
                            // console.log("val");
                            // console.log(observations);
                            if (valDate) {
                                return valProper;
                            }
                        }
                        // console.log(val);
                        // console.log(observations[valProperChech]);
                        // console.log(observations[valProper]);
                        return null;
                    }
                }
            }
        }
    }
}
