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
                return new namespace[model + "Managers_AJAX"](this.api, this.dao);
            };
            // ============================================================
            // getManagerOfIndexDB()
            // RÔLE : Retourne un Manager_indexDB pour le modèle demandé.
            //        Permet d'utiliser IndexedDB via le Service Worker.
            // ============================================================
            this.getManagerOfIndexDB = function(model, routerBleu, routerRouge, strategy) {
                var manager = new tools.Library.Manager_indexDB(this.api, this.dao);
                manager.table = model;
                
                // Initialiser avec les routers
                if (routerBleu && routerRouge) {
                    manager.init(routerBleu, routerRouge, strategy);
                }
                
                console.log("[Managers] getManagerOfIndexDB() →", model);
                return manager;
            };
        },
        Container: function (dao) {
            this.dao = dao;

            this.getContainerOf = function (model) {
                let namespace = tools.AppLib.Container;
                return new namespace[model + "Container"](this.dao);
            }
        },
        Managers_api: function (api, dao) {
            tools.Library.Managers.call(this, api, dao);
            this.table;
            this.listenerHttpRequest = [];

            // SwRouter — composé dans Managers_api (relation ◆)
            // Managers_api contient SwRouter car c'est elle
            // qui appelle _requestFetchAll
            this.swRouter = null;

            this.proxy = function () {
                return this.swRouter;
            };

            this.setSwRouter = function (swRouter) {
                this.swRouter = swRouter;
                console.log("[Managers_api] SwRouter injecté dans", this.table);
            };
            this._requestFetchAll = function (request, httpRequest, attribRequest, dataFilter, dataKeysCols = []) {

                // Si un SwRouter est disponible → on lui délègue
                // (il choisira AJAX ou IndexedDB selon le réseau)
                if (this.swRouter !== null) {

                    console.log("[Managers_api] Délégation au SwRouter pour :", request);
                    this.swRouter.route(
                        request,
                        this.table,
                        httpRequest,
                        attribRequest,
                        dataFilter,
                        dataKeysCols
                    );

                } else {

                    // Comportement EXISTANT conservé si pas de SwRouter
                    // (rétro-compatibilité garantie)
                    if (this.dao.uriExist(request)) {
                        httpRequest.setAttribute(attribRequest, this.dao.getElementsIndexUri(this.table, request));
                        httpRequest.chainActivate();
                    } else {
                        this._requestFetchAllAJAX(request, httpRequest, attribRequest, dataFilter, dataKeysCols);
                    }
                }
            };

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
             // ============================================================
            // SERVICE WORKER
            // ============================================================
            this.serviceWorker = null;
            
            // Initialiser le Service Worker si disponible
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                this.serviceWorker = navigator.serviceWorker.controller;
                console.log("[BackController] Service Worker disponible.");
            } else if ('serviceWorker' in navigator) {
                // Le Service Worker est supporté mais pas encore actif
                navigator.serviceWorker.ready.then(function(registration) {
                    if (registration.active) {
                        this.serviceWorker = registration.active;
                        console.log("[BackController] Service Worker prêt.");
                    }
                }.bind(this));
            }
            
            // ----------------------------------------------------------
            // getServiceWorker()
            // Rôle : Retourne la référence au Service Worker.
            // ----------------------------------------------------------
            this.getServiceWorker = function() {
                return this.serviceWorker;
            };
            
            // ----------------------------------------------------------
            // setServiceWorker()
            // Rôle : Définit la référence au Service Worker.
            // ----------------------------------------------------------
            this.setServiceWorker = function(sw) {
                this.serviceWorker = sw;
                console.log("[BackController] Service Worker mis à jour.");
            };
            
            // ----------------------------------------------------------
            // sendMessageToServiceWorker()
            // Rôle : Envoie un message au Service Worker.
            // ----------------------------------------------------------
            this.sendMessageToServiceWorker = function(message) {
                if (this.serviceWorker) {
                    this.serviceWorker.postMessage(message);
                    console.log("[BackController] Message envoyé au Service Worker.");
                } else {
                    console.warn("[BackController] Service Worker non disponible.");
                }
            };


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

        },
        // ============================================================
        // DelegateComponent
        // RÔLE : Interface que doivent implémenter les objets qui font
        //        le vrai travail (ex: IdbStore).
        //        Toute classe qui implémente cette interface doit
        //        fournir les méthodes ci-dessous.
        // ============================================================
        DelegateComponent: function () {
            // Cette interface définit les méthodes à implémenter
            // par les objets délégués.
            //
            // Méthodes à implémenter :
            //   - save(endpoint, data, operation) : Promise
            //   - getPending() : Promise
            //   - markSynced(localId, serverData) : Promise
            //   - purgeSynced(olderThanDays) : Promise
            //   - cacheReadResponse(endpoint, data) : Promise
            //   - getReadCache(endpoint) : Promise
            //
            // NOTE : Cette fonction n'est qu'une interface.
            //        Elle ne fait rien par elle-même.
        },
        // ============================================================
        // ProxyDAO (abstract)
        // RÔLE : Classe abstraite qui définit les méthodes de base
        //        pour tous les ProxyDAO.
        //        Un ProxyDAO gère la délégation de travail vers un
        //        DelegateComponent.
        // ============================================================
        ProxyDAO: function () {
            // Attributs
            this.delegateComponent = null;   // Référence vers le DelegateComponent
            this.dao = null;                  // Référence vers le DAO concret

            // ----------------------------------------------------------
            // delegate()
            // Rôle : Retourne le DelegateComponent actif.
            //        Si aucun n'est défini, retourne null.
            // ----------------------------------------------------------
            this.delegate = function () {
                return this.delegateComponent;
            };

            // ----------------------------------------------------------
            // update_delegate()
            // Rôle : Met à jour le DelegateComponent.
            //        Permet de changer dynamiquement le composant
            //        qui fait le travail (ex: passer de AJAX à IndexedDB).
            // ----------------------------------------------------------
            this.update_delegate = function (newDelegate) {
                if (newDelegate && typeof newDelegate.save === 'function') {
                    this.delegateComponent = newDelegate;
                    console.log("[ProxyDAO] Delegate mis à jour.");
                    return true;
                }
                console.warn("[ProxyDAO] Le nouveau delegate ne respecte pas l'interface DelegateComponent.");
                return false;
            };

            // ----------------------------------------------------------
            // Méthodes de délégation (à redéfinir dans les classes filles)
            // ----------------------------------------------------------
            this.save = function (endpoint, data, operation) {
                if (this.delegateComponent) {
                    return this.delegateComponent.save(endpoint, data, operation);
                }
                console.warn("[ProxyDAO] Aucun delegate défini.");
                return Promise.reject("Aucun delegate défini.");
            };

            this.getPending = function () {
                if (this.delegateComponent) {
                    return this.delegateComponent.getPending();
                }
                return Promise.resolve([]);
            };

            this.markSynced = function (localId, serverData) {
                if (this.delegateComponent) {
                    return this.delegateComponent.markSynced(localId, serverData);
                }
                return Promise.reject("Aucun delegate défini.");
            };

            this.purgeSynced = function (olderThanDays) {
                if (this.delegateComponent) {
                    return this.delegateComponent.purgeSynced(olderThanDays);
                }
                return Promise.reject("Aucun delegate défini.");
            };

            this.cacheReadResponse = function (endpoint, data) {
                if (this.delegateComponent) {
                    return this.delegateComponent.cacheReadResponse(endpoint, data);
                }
                return Promise.reject("Aucun delegate défini.");
            };

            this.getReadCache = function (endpoint) {
                if (this.delegateComponent) {
                    return this.delegateComponent.getReadCache(endpoint);
                }
                return Promise.resolve(null);
            };
        },

        // ============================================================
        // ProxyDAO_IndexedDB (BLEU)
        // RÔLE : Hérite de ProxyDAO.
        //        Gère le DAO IndexedDB (IdbStore).
        //        Utilise IdbStore comme DelegateComponent.
        // ============================================================
        ProxyDAO_IndexedDB: function (idbStore) {
            // Appel du constructeur parent
            tools.Library.ProxyDAO.call(this);

            // Attributs
            this.dao = idbStore || null;   // Référence vers IdbStore

            // Initialiser le delegate avec IdbStore
            if (this.dao) {
                this.update_delegate(this.dao);
                console.log("[ProxyDAO_IndexedDB] Initialisé avec IdbStore.");
            }

            // ----------------------------------------------------------
            // getDao()
            // Rôle : Retourne la référence vers le DAO.
            // ----------------------------------------------------------
            this.getDao = function () {
                return this.dao;
            };

            // ----------------------------------------------------------
            // setDao()
            // Rôle : Met à jour le DAO et le delegate.
            // ----------------------------------------------------------
            this.setDao = function (newDao) {
                this.dao = newDao;
                if (this.dao) {
                    this.update_delegate(this.dao);
                }
            };
        },
        // ============================================================
        // ProxyDAO_Matrice (ROUGE)
        // RÔLE : Hérite de ProxyDAO_IndexedDB.
        //        Gère le DAO Matrice (DAOContainer).
        //        Contient une instance de ProxyDAO_IndexedDB (composition).
        //
        // RELATION :
        //   - Héritage : ProxyDAO_Matrice hérite de ProxyDAO_IndexedDB
        //   - Composition : ProxyDAO_Matrice contient une instance
        //                   de ProxyDAO_IndexedDB
        // ============================================================
        ProxyDAO_Matrice: function (daoContainer, proxyIndexedDB) {
            // Appel du constructeur parent (ProxyDAO_IndexedDB)
            tools.Library.ProxyDAO_IndexedDB.call(this, null);

            // Attributs
            this.dao = daoContainer || null;   // DAO Matrice (DAOContainer)
            this.proxyDB = proxyIndexedDB || null;  // Composition : instance de ProxyDAO_IndexedDB

            // Si un proxyDB est fourni, l'utiliser comme delegate principal
            if (this.proxyDB) {
                this.update_delegate(this.proxyDB);
                console.log("[ProxyDAO_Matrice] Initialisé avec ProxyDAO_IndexedDB en composition.");
            }

            // ----------------------------------------------------------
            // getDao()
            // Rôle : Retourne la référence vers le DAO Matrice.
            // ----------------------------------------------------------
            this.getDao = function () {
                return this.dao;
            };

            // ----------------------------------------------------------
            // getProxyDB()
            // Rôle : Retourne la référence vers le ProxyDAO_IndexedDB
            //        (composition).
            // ----------------------------------------------------------
            this.getProxyDB = function () {
                return this.proxyDB;
            };

            // ----------------------------------------------------------
            // setProxyDB()
            // Rôle : Met à jour le ProxyDAO_IndexedDB (composition).
            // ----------------------------------------------------------
            this.setProxyDB = function (newProxyDB) {
                this.proxyDB = newProxyDB;
                if (this.proxyDB) {
                    this.update_delegate(this.proxyDB);
                }
            };

            // ----------------------------------------------------------
            // Surcharge de save() pour utiliser la composition
            // ----------------------------------------------------------
            this.save = function (endpoint, data, operation) {
                // Priorité au proxyDB (composition) s'il existe
                if (this.proxyDB && this.proxyDB.delegate()) {
                    return this.proxyDB.save(endpoint, data, operation);
                }
                // Sinon, utiliser le delegate parent
                return tools.Library.ProxyDAO.prototype.save.call(this, endpoint, data, operation);
            };
        },

        // ============================================================
        // ProxyRouter (abstract)
        // RÔLE : Classe abstraite qui détecte les changements
        //        d'environnement (réseau) et route vers le bon
        //        ProxyDAO.
        //
        // MÉTHODES :
        //   - candidates() : Retourne la liste des ProxyDAO disponibles
        //   - proxy() : Retourne le ProxyDAO actif
        //   - route(target) : Route vers un ProxyDAO spécifique
        //   - choose_route() : Pattern Stratégie - choisit le ProxyDAO
        //                      en fonction de l'état du réseau
        // ============================================================
        ProxyRouter: function () {
            // Attributs
            this.candidateList = [];      // Liste des ProxyDAO disponibles
            this.currentProxy = null;     // ProxyDAO actif
            this.strategy = null;         // Stratégie de choix (ChooseRouteStrategy)

            // ----------------------------------------------------------
            // candidates()
            // Rôle : Retourne la liste des ProxyDAO disponibles.
            //        Peut être surchargé par les classes filles.
            // ----------------------------------------------------------
            this.candidates = function () {
                return this.candidateList;
            };

            // ----------------------------------------------------------
            // proxy()
            // Rôle : Retourne le ProxyDAO actif.
            // ----------------------------------------------------------
            this.proxy = function () {
                return this.currentProxy;
            };

            // ----------------------------------------------------------
            // route(target)
            // Rôle : Route vers un ProxyDAO spécifique.
            //        Le target peut être un nom d'entité ou un ProxyDAO.
            // ----------------------------------------------------------
            this.route = function (target) {
                // Si target est un ProxyDAO, l'utiliser directement
                if (target && typeof target.delegate === 'function') {
                    this.currentProxy = target;
                    console.log("[ProxyRouter] Routé vers le ProxyDAO fourni.");
                    return this.currentProxy;
                }

                // Si target est un nom (ex: "User", "Establishment")
                // Chercher dans la liste des candidats
                for (var i = 0; i < this.candidateList.length; i++) {
                    var candidate = this.candidateList[i];
                    // Si le candidat correspond au target
                    if (candidate._name === target) {
                        this.currentProxy = candidate;
                        console.log("[ProxyRouter] Routé vers :", target);
                        return this.currentProxy;
                    }
                }

                console.warn("[ProxyRouter] Aucun ProxyDAO trouvé pour :", target);
                return null;
            };

            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Pattern Stratégie.
            //        Choisit le ProxyDAO en fonction de l'état du réseau.
            //        À surcharger dans les classes filles.
            // ----------------------------------------------------------
            this.choose_route = function () {
                if (this.strategy && typeof this.strategy.choose_route === 'function') {
                    return this.strategy.choose_route(this.candidateList);
                }
                // Stratégie par défaut : retourner le premier candidat
                return this.candidateList.length > 0 ? this.candidateList[0] : null;
            };

            // ----------------------------------------------------------
            // setStrategy()
            // Rôle : Définit la stratégie de routage.
            // ----------------------------------------------------------
            this.setStrategy = function (strategy) {
                this.strategy = strategy;
                console.log("[ProxyRouter] Stratégie mise à jour.");
            };
        },
        // ============================================================
        // ExternalProxyRouter_IndexedDB (BLEU)
        // RÔLE : Hérite de ProxyRouter.
        //        Gère une entité précise (ex: User, Establishment)
        //        avec le DAO IndexedDB.
        // ============================================================
        ExternalProxyRouter_IndexedDB: function (entityName, proxyDAO) {
            // Appel du constructeur parent
            tools.Library.ProxyRouter.call(this);

            // Attributs
            this._name = entityName || "Unknown";
            this.proxyDAO = proxyDAO || null;

            // Ajouter le proxyDAO à la liste des candidats
            if (this.proxyDAO) {
                this.candidateList.push(this.proxyDAO);
                this.currentProxy = this.proxyDAO;
                console.log("[ExternalProxyRouter_IndexedDB] Créé pour :", this._name);
            }

            // ----------------------------------------------------------
            // getEntityName()
            // Rôle : Retourne le nom de l'entité gérée.
            // ----------------------------------------------------------
            this.getEntityName = function () {
                return this._name;
            };

            // ----------------------------------------------------------
            // getProxyDAO()
            // Rôle : Retourne le ProxyDAO.
            // ----------------------------------------------------------
            this.getProxyDAO = function () {
                return this.proxyDAO;
            };

            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Surcharge de la méthode parent.
            //        Retourne toujours le ProxyDAO IndexedDB (bleu).
            // ----------------------------------------------------------
            this.choose_route = function () {
                return this.proxyDAO;
            };
        },
        // ============================================================
        // ExternalProxyRouter_Matrice (ROUGE)
        // RÔLE : Hérite de ProxyRouter.
        //        Gère une entité précise (ex: User, Establishment)
        //        avec le DAO Matrice.
        // ============================================================
        ExternalProxyRouter_Matrice: function (entityName, proxyDAO) {
            // Appel du constructeur parent
            tools.Library.ProxyRouter.call(this);

            // Attributs
            this._name = entityName || "Unknown";
            this.proxyDAO = proxyDAO || null;

            // Ajouter le proxyDAO à la liste des candidats
            if (this.proxyDAO) {
                this.candidateList.push(this.proxyDAO);
                this.currentProxy = this.proxyDAO;
                console.log("[ExternalProxyRouter_Matrice] Créé pour :", this._name);
            }

            // ----------------------------------------------------------
            // getEntityName()
            // Rôle : Retourne le nom de l'entité gérée.
            // ----------------------------------------------------------
            this.getEntityName = function () {
                return this._name;
            };

            // ----------------------------------------------------------
            // getProxyDAO()
            // Rôle : Retourne le ProxyDAO.
            // ----------------------------------------------------------
            this.getProxyDAO = function () {
                return this.proxyDAO;
            };

            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Surcharge de la méthode parent.
            //        Retourne toujours le ProxyDAO Matrice (rouge).
            // ----------------------------------------------------------
            this.choose_route = function () {
                return this.proxyDAO;
            };
        },
        // ============================================================
        // ChooseRouteStrategy (interface)
        // RÔLE : Interface pour les stratégies de routage.
        //        Définit la méthode choose_route() qui doit être
        //        implémentée par les stratégies concrètes.
        // ============================================================
        ChooseRouteStrategy: function () {
            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Choisit le ProxyDAO en fonction de l'état du réseau.
            //        À implémenter dans les classes filles.
            // ----------------------------------------------------------
            this.choose_route = function (candidates) {
                // À surcharger
                return candidates.length > 0 ? candidates[0] : null;
            };
        },

        // ============================================================
        // OnlineStrategy
        // RÔLE : Stratégie de routage pour le mode EN LIGNE.
        //        Retourne le ProxyDAO_AJAX.
        // ============================================================
        OnlineStrategy: function () {
            // Appel du constructeur parent
            tools.Library.ChooseRouteStrategy.call(this);

            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Sélectionne le ProxyDAO_AJAX dans la liste des
            //        candidats.
            //        Recherche un ProxyDAO qui gère l'AJAX.
            // ----------------------------------------------------------
            this.choose_route = function (candidates) {
                // Priorité : chercher un ProxyDAO_AJAX (ou un proxy qui n'est pas IndexedDB)
                for (var i = 0; i < candidates.length; i++) {
                    var candidate = candidates[i];
                    // Vérifier si le candidat gère l'AJAX
                    // (on suppose que ProxyDAO_Matrice gère l'AJAX)
                    if (candidate._name && candidate._name.indexOf('Matrice') !== -1) {
                        console.log("[OnlineStrategy] ProxyDAO_Matrice sélectionné.");
                        return candidate;
                    }
                    // Vérifier si le candidat a une méthode spécifique à l'AJAX
                    if (typeof candidate.isOnline !== 'undefined' && candidate.isOnline) {
                        return candidate;
                    }
                }
                // Si aucun trouvé, retourner le premier candidat
                console.warn("[OnlineStrategy] Aucun ProxyDAO AJAX trouvé, retour du premier candidat.");
                return candidates.length > 0 ? candidates[0] : null;
            };
        },

        // ============================================================
        // OfflineStrategy
        // RÔLE : Stratégie de routage pour le mode HORS LIGNE.
        //        Retourne le ProxyDAO_IndexedDB.
        // ============================================================
        OfflineStrategy: function () {
            // Appel du constructeur parent
            tools.Library.ChooseRouteStrategy.call(this);

            // ----------------------------------------------------------
            // choose_route()
            // Rôle : Sélectionne le ProxyDAO_IndexedDB dans la liste des
            //        candidats.
            //        Recherche un ProxyDAO qui gère IndexedDB.
            // ----------------------------------------------------------
            this.choose_route = function (candidates) {
                // Priorité : chercher un ProxyDAO_IndexedDB
                for (var i = 0; i < candidates.length; i++) {
                    var candidate = candidates[i];
                    // Vérifier si le candidat est un ProxyDAO_IndexedDB
                    if (candidate._name && candidate._name.indexOf('IndexedDB') !== -1) {
                        console.log("[OfflineStrategy] ProxyDAO_IndexedDB sélectionné.");
                        return candidate;
                    }
                    // Vérifier si le candidat a une méthode spécifique à IndexedDB
                    if (typeof candidate.isOffline !== 'undefined' && candidate.isOffline) {
                        return candidate;
                    }
                }
                // Si aucun trouvé, retourner le premier candidat
                console.warn("[OfflineStrategy] Aucun ProxyDAO IndexedDB trouvé, retour du premier candidat.");
                return candidates.length > 0 ? candidates[0] : null;
            };
        }

    }
}
tools.Library.ProxyDAO_IndexedDB.prototype = Object.create(tools.Library.ProxyDAO.prototype);
tools.Library.ProxyDAO_IndexedDB.prototype.constructor = tools.Library.ProxyDAO_IndexedDB;

// Héritage : ProxyDAO_Matrice hérite de ProxyDAO_IndexedDB
tools.Library.ProxyDAO_Matrice.prototype = Object.create(tools.Library.ProxyDAO_IndexedDB.prototype);
tools.Library.ProxyDAO_Matrice.prototype.constructor = tools.Library.ProxyDAO_Matrice;

// Héritage : ExternalProxyRouter_IndexedDB hérite de ProxyRouter
tools.Library.ExternalProxyRouter_IndexedDB.prototype = Object.create(tools.Library.ProxyRouter.prototype);
tools.Library.ExternalProxyRouter_IndexedDB.prototype.constructor = tools.Library.ExternalProxyRouter_IndexedDB;

// Héritage : ExternalProxyRouter_Matrice hérite de ProxyRouter
tools.Library.ExternalProxyRouter_Matrice.prototype = Object.create(tools.Library.ProxyRouter.prototype);
tools.Library.ExternalProxyRouter_Matrice.prototype.constructor = tools.Library.ExternalProxyRouter_Matrice;

// Héritage : OnlineStrategy hérite de ChooseRouteStrategy
tools.Library.OnlineStrategy.prototype = Object.create(tools.Library.ChooseRouteStrategy.prototype);
tools.Library.OnlineStrategy.prototype.constructor = tools.Library.OnlineStrategy;

// Héritage : OfflineStrategy hérite de ChooseRouteStrategy
tools.Library.OfflineStrategy.prototype = Object.create(tools.Library.ChooseRouteStrategy.prototype);
tools.Library.OfflineStrategy.prototype.constructor = tools.Library.OfflineStrategy;

// ============================================================
// PHASE 2 : CandidateFactory + Manager_indexDB
// ============================================================

// ============================================================
// 11. CandidateFactory
// RÔLE : Fabrique dynamiquement les ExternalProxyRouter
//        pour chaque entité (User, Establishment, DataMatrix).
//
//        Crée :
//        - ExternalProxyRouter_IndexedDB (bleu) avec ProxyDAO_IndexedDB
//        - ExternalProxyRouter_Matrice (rouge) avec ProxyDAO_Matrice
// ============================================================
tools.Library.CandidateFactory = function () {

    // ----------------------------------------------------------
    // createForEntity()
    // Rôle : Crée les deux ExternalProxyRouter pour une entité.
    //
    // Paramètres :
    //   - entityName : nom de l'entité (ex: "User", "Establishment")
    //   - idbStore   : instance de IdbStore (DelegateComponent)
    //   - daoContainer : instance de DAOContainer (matrice)
    //
    // Retourne : un objet { bleu: ExternalProxyRouter_IndexedDB, rouge: ExternalProxyRouter_Matrice }
    // ----------------------------------------------------------
    this.createForEntity = function (entityName, idbStore, daoContainer) {

        if (!entityName) {
            console.error("[CandidateFactory] entityName est requis.");
            return null;
        }

        // ---- 1. Créer le ProxyDAO_IndexedDB (BLEU) ----
        // Il contient IdbStore comme DelegateComponent
        var proxyDAO_IndexedDB = new tools.Library.ProxyDAO_IndexedDB(idbStore);
        proxyDAO_IndexedDB._name = entityName + "_IndexedDB";

        console.log("[CandidateFactory] ProxyDAO_IndexedDB créé pour :", entityName);

        // ---- 2. Créer le ProxyDAO_Matrice (ROUGE) ----
        // Il hérite de ProxyDAO_IndexedDB ET contient une instance en composition
        var proxyDAO_Matrice = new tools.Library.ProxyDAO_Matrice(daoContainer, proxyDAO_IndexedDB);
        proxyDAO_Matrice._name = entityName + "_Matrice";

        console.log("[CandidateFactory] ProxyDAO_Matrice créé pour :", entityName);

        // ---- 3. Créer les ExternalProxyRouter ----
        var externalRouter_IndexedDB = new tools.Library.ExternalProxyRouter_IndexedDB(
            entityName,
            proxyDAO_IndexedDB
        );

        var externalRouter_Matrice = new tools.Library.ExternalProxyRouter_Matrice(
            entityName,
            proxyDAO_Matrice
        );

        console.log("[CandidateFactory] ExternalProxyRouter créés pour :", entityName);

        // ---- 4. Retourner les deux routers ----
        return {
            bleu: externalRouter_IndexedDB,
            rouge: externalRouter_Matrice,
            proxyDAO_IndexedDB: proxyDAO_IndexedDB,
            proxyDAO_Matrice: proxyDAO_Matrice
        };
    };

    // ----------------------------------------------------------
    // createAll()
    // Rôle : Crée les ExternalProxyRouter pour toutes les entités.
    //
    // Paramètres :
    //   - entities : tableau de noms d'entités
    //                ex: ["User", "Establishment", "DataMatrix"]
    //   - idbStore : instance de IdbStore (DelegateComponent)
    //   - daoContainer : instance de DAOContainer
    //
    // Retourne : un objet { entityName: { bleu, rouge }, ... }
    // ----------------------------------------------------------
    this.createAll = function (entities, idbStore, daoContainer) {

        if (!entities || entities.length === 0) {
            console.warn("[CandidateFactory] Aucune entité à créer.");
            return {};
        }

        var result = {};

        for (var i = 0; i < entities.length; i++) {
            var entityName = entities[i];
            result[entityName] = this.createForEntity(entityName, idbStore, daoContainer);
        }

        console.log("[CandidateFactory] Tous les ExternalProxyRouter créés pour :", entities.join(", "));
        return result;
    };

    // ----------------------------------------------------------
    // getCandidates()
    // Rôle : Retourne la liste de tous les ProxyDAO disponibles.
    //        Utile pour la stratégie de routage.
    // ----------------------------------------------------------
    this.getCandidates = function (candidatesMap) {
        var list = [];

        for (var entityName in candidatesMap) {
            if (candidatesMap.hasOwnProperty(entityName)) {
                var entry = candidatesMap[entityName];
                if (entry.bleu && entry.bleu.proxyDAO) {
                    list.push(entry.bleu.proxyDAO);
                }
                if (entry.rouge && entry.rouge.proxyDAO) {
                    list.push(entry.rouge.proxyDAO);
                }
            }
        }

        return list;
    };
};

console.log("[tools-3.5.js] CandidateFactory chargé.");


// ============================================================
// 12. Manager_indexDB
// RÔLE : Hérite de Manager_api.
//        Utilise le Service Worker (navigator.serviceWorker)
//        et les ExternalProxyRouter pour gérer les opérations
//        hors ligne.
// ============================================================
tools.Library.Manager_indexDB = function (api, dao) {
    // Appel du constructeur parent
    tools.Library.Managers.call(this, api, dao);

    this.table = null;
    this.listenerHttpRequest = [];

    // Référence vers le Service Worker
    this.serviceWorker = null;

    // Référence vers les ExternalProxyRouter
    this.routerBleu = null;   // ExternalProxyRouter_IndexedDB
    this.routerRouge = null;  // ExternalProxyRouter_Matrice

    // Stratégie actuelle (online/offline)
    this.strategy = null;

    // ----------------------------------------------------------
    // init()
    // Rôle : Initialise le Manager avec les routers.
    // ----------------------------------------------------------
    this.init = function (routerBleu, routerRouge, strategy) {
        this.routerBleu = routerBleu;
        this.routerRouge = routerRouge;
        this.strategy = strategy || new tools.Library.OnlineStrategy();

        // Si un router bleu est fourni, l'utiliser par défaut
        if (this.routerBleu) {
            this.routerBleu.setStrategy(this.strategy);
        }
        if (this.routerRouge) {
            this.routerRouge.setStrategy(this.strategy);
        }

        console.log("[Manager_indexDB] Initialisé pour :", this.table);
    };

    // ----------------------------------------------------------
    // setStrategy()
    // Rôle : Change la stratégie de routage (online/offline).
    // ----------------------------------------------------------
    this.setStrategy = function (strategy) {
        this.strategy = strategy;
        if (this.routerBleu) {
            this.routerBleu.setStrategy(strategy);
        }
        if (this.routerRouge) {
            this.routerRouge.setStrategy(strategy);
        }
        console.log("[Manager_indexDB] Stratégie mise à jour pour :", this.table);
    };

    // ----------------------------------------------------------
    // getProxyDAO()
    // Rôle : Retourne le ProxyDAO actif selon la stratégie.
    // ----------------------------------------------------------
    this.getProxyDAO = function () {
        // Priorité au router rouge (matrice) s'il existe
        if (this.routerRouge && this.routerRouge.choose_route) {
            return this.routerRouge.choose_route();
        }
        // Sinon router bleu (indexedDB)
        if (this.routerBleu && this.routerBleu.choose_route) {
            return this.routerBleu.choose_route();
        }
        return null;
    };

    // ----------------------------------------------------------
    // save()
    // Rôle : Sauvegarde une opération (CREATE/UPDATE/DELETE).
    //        Délègue au ProxyDAO actif.
    // ----------------------------------------------------------
    this.save = function (endpoint, data, operation) {
        var proxy = this.getProxyDAO();
        if (proxy && proxy.save) {
            return proxy.save(endpoint, data, operation);
        }
        console.warn("[Manager_indexDB] Aucun ProxyDAO disponible pour save().");
        return Promise.reject("Aucun ProxyDAO disponible.");
    };

    // ----------------------------------------------------------
    // getPending()
    // Rôle : Récupère les opérations en attente.
    // ----------------------------------------------------------
    this.getPending = function () {
        var proxy = this.getProxyDAO();
        if (proxy && proxy.getPending) {
            return proxy.getPending();
        }
        return Promise.resolve([]);
    };

    // ----------------------------------------------------------
    // markSynced()
    // Rôle : Marque une opération comme synchronisée.
    // ----------------------------------------------------------
    this.markSynced = function (localId, serverData) {
        var proxy = this.getProxyDAO();
        if (proxy && proxy.markSynced) {
            return proxy.markSynced(localId, serverData);
        }
        return Promise.reject("Aucun ProxyDAO disponible.");
    };

    // ----------------------------------------------------------
    // setServiceWorker()
    // Rôle : Définit la référence vers le Service Worker.
    // ----------------------------------------------------------
    this.setServiceWorker = function (sw) {
        this.serviceWorker = sw;
        console.log("[Manager_indexDB] Service Worker enregistré.");
    };

    // ----------------------------------------------------------
    // Surcharge de _requestFetchAll()
    // Rôle : Utilise le ProxyDAO pour les requêtes.
    // ----------------------------------------------------------
    this._requestFetchAll = function (request, httpRequest, attribRequest, dataFilter, dataKeysCols) {
        // Pour l'instant, on utilise le comportement AJAX par défaut
        // mais on pourrait utiliser le ProxyDAO ici
        this._requestFetchAllAJAX(request, httpRequest, attribRequest, dataFilter, dataKeysCols);
    };

    // ----------------------------------------------------------
    // _requestFetchAllAJAX()
    // Rôle : Comportement AJAX standard.
    // ----------------------------------------------------------
    this._requestFetchAllAJAX = function (request, httpRequest, attribRequest, dataFilter, dataKeysCols) {
        this.listenerHttpRequest[attribRequest] = httpRequest;

        var context = this;
        var table = this.table;

        $.ajax({
            type: "POST",
            url: request,
            data: dataFilter,
            dataType: "JSON",
            success: function (reponse) {
                console.log("[Manager_indexDB] AJAX succès pour :", table, "|", reponse.length);
                context.dao.updateTable(request, table, reponse, dataKeysCols);
                httpRequest.setAttribute(attribRequest, context.dao.getElementsIndexUri(table, request));
                httpRequest.chainActivate();
            },
            error: function (requestH, error) {
                console.error("[Manager_indexDB] AJAX erreur :", error);
                // En cas d'erreur réseau, essayer d'utiliser le ProxyDAO
                var proxy = context.getProxyDAO();
                if (proxy && proxy.getReadCache) {
                    proxy.getReadCache(request).then(function (cachedData) {
                        if (cachedData) {
                            console.log("[Manager_indexDB] Données du cache pour :", request);
                            // Construire les entités à partir des données en cache
                            var entities = cachedData.map(function (item) {
                                return new tools.AppLib.Entities[table](item);
                            });
                            httpRequest.setAttribute(attribRequest, entities);
                            httpRequest.chainActivate();
                        } else {
                            httpRequest.setAttribute(attribRequest, []);
                            httpRequest.chainActivate();
                        }
                    });
                } else {
                    httpRequest.setAttribute(attribRequest, []);
                    httpRequest.chainActivate();
                }
            }
        });
    };
};

// Héritage : Manager_indexDB hérite de Managers
tools.Library.Manager_indexDB.prototype = Object.create(tools.Library.Managers.prototype);
tools.Library.Manager_indexDB.prototype.constructor = tools.Library.Manager_indexDB;

console.log("[tools-3.5.js] Manager_indexDB chargé.");
