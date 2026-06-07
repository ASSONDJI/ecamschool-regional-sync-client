// ============================================================
// FICHIER  : tools-3.5.library.IDBManager.test.js
//
// RÔLE     : Tests du CRUD IndexedDB via IDBManager.
//            Chaque test est isolé : le store est vidé avant
//            chaque test via clear() pour garantir l'indépendance.
//
// STRUCTURE DES TESTS :
//   - TestRunner  : moteur léger d'exécution des tests
//   - IDBTest     : suite de tests sur IDBManager
//
// 

// ============================================================
// TestRunner — moteur de tests léger
// Rôle : exécuter une suite de tests séquentiellement,
//        afficher les résultats et le bilan final.
// ============================================================
tools.Library.TestRunner = function (suiteName) {

    this.suiteName = suiteName;

    // Liste des tests à exécuter : [{name, fn}, ...]
    this.tests = [];

    // Compteurs de résultats
    this.passed = 0;
    this.failed = 0;

    // ----------------------------------------------------------
    // addTest()
    // Rôle : enregistrer un test dans la suite.
    //
    // Paramètres :
    //   - name : nom descriptif du test
    //   - fn   : function(done, assert) — le corps du test.
    //            done()  → appeler quand le test est terminé
    //            assert  → objet avec les méthodes de vérification
    // ----------------------------------------------------------
    this.addTest = function (name, fn) {
        this.tests.push({ name: name, fn: fn });
    };

    // ----------------------------------------------------------
    // run()
    // Rôle : exécuter tous les tests enregistrés en séquence.
    //        Chaque test attend la fin du précédent (done())
    //        avant de démarrer, car IndexedDB est asynchrone.
    // ----------------------------------------------------------
    this.run = function () {

        let context = this;
        let index   = 0;

        console.log("╔══════════════════════════════════════════");
        console.log("║ [TEST SUITE] " + this.suiteName);
        console.log("╠══════════════════════════════════════════");

        // Méthodes d'assertion passées à chaque test
        let assert = {

            // Vérifie que condition est vraie
            isTrue: function (condition, message) {
                if (condition) {
                    console.log("║   ✅ ASSERT OK  — " + message);
                } else {
                    console.error("║   ❌ ASSERT KO  — " + message);
                    throw new Error("ASSERT FAILED: " + message);
                }
            },

            // Vérifie que deux valeurs sont égales
            equals: function (actual, expected, message) {
                if (actual === expected) {
                    console.log("║   ✅ EQUALS OK  — " + message +
                                " | attendu: " + expected +
                                " | obtenu: " + actual);
                } else {
                    console.error("║   ❌ EQUALS KO  — " + message +
                                  " | attendu: " + expected +
                                  " | obtenu: " + actual);
                    throw new Error("EQUALS FAILED: " + message);
                }
            },

            // Vérifie qu'une valeur n'est pas null/undefined
            notNull: function (value, message) {
                if (value !== null && value !== undefined) {
                    console.log("║   ✅ NOT NULL OK — " + message);
                } else {
                    console.error("║   ❌ NOT NULL KO — " + message + " | valeur: " + value);
                    throw new Error("NOT NULL FAILED: " + message);
                }
            },

            // Vérifie qu'une valeur est null ou undefined
            isNull: function (value, message) {
                if (value === null || value === undefined) {
                    console.log("║   ✅ IS NULL OK  — " + message);
                } else {
                    console.error("║   ❌ IS NULL KO  — " + message + " | valeur: " + value);
                    throw new Error("IS NULL FAILED: " + message);
                }
            }
        };

        // Fonction récursive qui exécute les tests un par un
        function runNext() {

            if (index >= context.tests.length) {
                // Tous les tests sont terminés → afficher le bilan
                console.log("╠══════════════════════════════════════════");
                console.log("║ BILAN : " + context.passed + " réussis / " +
                            (context.passed + context.failed) + " total");
                if (context.failed === 0) {
                    console.log("║ 🎉 TOUS LES TESTS SONT PASSÉS");
                } else {
                    console.log("║ ⚠️  " + context.failed + " TEST(S) ÉCHOUÉ(S)");
                }
                console.log("╚══════════════════════════════════════════");
                return;
            }

            let test = context.tests[index];
            index++;

            console.log("║");
            console.log("║ [TEST " + index + "] " + test.name);

            // done() : appelé par le test quand il a terminé
            let done = function () {
                context.passed++;
                console.log("║ → ✅ PASSÉ");
                runNext(); // passer au test suivant
            };

            // fail() : appelé si une assertion échoue
            let fail = function (err) {
                context.failed++;
                console.error("║ → ❌ ÉCHOUÉ :", err.message || err);
                runNext(); // continuer malgré l'échec
            };

            // Exécuter le test en capturant les erreurs
            try {
                test.fn(done, fail, assert);
            } catch (err) {
                fail(err);
            }
        }

        runNext();
    };
};


// ============================================================
// IDBTest — suite de tests pour IDBManager
// Utilise le store "IDBManager_Test" pour ne pas polluer
// les données réelles de l'application.
// ============================================================
tools.Library.IDBTest = function () {

    // Nom du store de test — séparé des données réelles
    let STORE_TEST = "IDBManager_Test";

    // Instance IDBManager partagée entre tous les tests
    // Pointe sur la même base que l'application
    // Base dédiée aux tests — séparée de ecamschool_idb
    // pour éviter tout conflit de version avec ProxyDAO_idb
    let idb = new tools.Library.IDBManager("ecamschool_idb_test", 1);

    // Runner de la suite
    let runner = new tools.Library.TestRunner("IDBManager — CRUD IndexedDB");

    // ----------------------------------------------------------
    // Données de test réutilisées dans les tests
    // Correspondent à la structure réelle de Enseignement
    // ----------------------------------------------------------
    let SAMPLE_RECORD_1 = {
        id          : 9001,
        idEnseignant: 6744,
        idDiscipline: 26848,
        idClasse    : 1343,
        regime      : "Francophone",
        nbreHeures  : null,
        anneeAcad   : "2025-2026",
        portee      : "CLASSE"
    };

    let SAMPLE_RECORD_2 = {
        id          : 9002,
        idEnseignant: 6661,
        idDiscipline: 28158,
        idClasse    : 1345,
        regime      : "Anglophone",
        nbreHeures  : 4,
        anneeAcad   : "2025-2026",
        portee      : "CLASSE"
    };

    // ============================================================
    // TEST 1 — OPEN
    // Vérifie que la base s'ouvre correctement et que le store
    // de test est créé.
    // ============================================================
    runner.addTest("open() — ouverture de la base IndexedDB", function (done, fail, assert) {

        idb.open([STORE_TEST], function () {

            try {
                // La base doit être ouverte (db non null)
                assert.notNull(idb.db, "idb.db doit être non null après open()");

                // Le store de test doit exister dans la base
                assert.isTrue(
                    idb.db.objectStoreNames.contains(STORE_TEST),
                    "Le store '" + STORE_TEST + "' doit exister"
                );
                done();
            } catch (err) { fail(err); }

        }, function (err) { fail(err); });
    });

    // ============================================================
    // TEST 2 — CLEAR (préparation)
    // Vide le store avant les tests pour garantir un état propre.
    // ============================================================
    runner.addTest("clear() — vider le store avant les tests", function (done, fail, assert) {

        idb.clear(STORE_TEST, function () {

            // Vérifier que le store est bien vide après clear()
            idb.count(STORE_TEST, function (total) {
                try {
                    assert.equals(total, 0, "Le store doit être vide après clear()");
                    done();
                } catch (err) { fail(err); }
            }, function (err) { fail(err); });

        }, function (err) { fail(err); });
    });

    // ============================================================
    // TEST 3 — CREATE
    // Insère un enregistrement et vérifie qu'il est bien créé.
    // ============================================================
    runner.addTest("create() — insérer un enregistrement", function (done, fail, assert) {

        idb.create(STORE_TEST, SAMPLE_RECORD_1, function (insertedId) {

            try {
                // L'id retourné doit correspondre à celui de l'objet
                assert.equals(insertedId, SAMPLE_RECORD_1.id,
                    "L'id inséré doit être " + SAMPLE_RECORD_1.id);

                // Vérifier que le store contient maintenant 1 élément
                idb.count(STORE_TEST, function (total) {
                    try {
                        assert.equals(total, 1, "Le store doit contenir 1 élément");
                        done();
                    } catch (err) { fail(err); }
                }, function (err) { fail(err); });

            } catch (err) { fail(err); }

        }, function (err) { fail(new Error("create() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 4 — CREATE DOUBLON
    // Vérifie que create() échoue si on insère un id existant.
    // ============================================================
    runner.addTest("create() — refuser un doublon (même id)", function (done, fail, assert) {

        // Tenter d'insérer le même enregistrement une seconde fois
        idb.create(STORE_TEST, SAMPLE_RECORD_1,

            // Si succès → le test échoue (doublon accepté = bug)
            function () {
                fail(new Error("create() aurait dû refuser le doublon"));
            },

            // Si erreur → comportement attendu
            function (err) {
                try {
                    assert.notNull(err, "Une erreur doit être retournée pour un doublon");
                    console.log("║   ℹ️  Erreur doublon reçue (attendu) :", err.name || err);
                    done();
                } catch (e) { fail(e); }
            }
        );
    });

    // ============================================================
    // TEST 5 — READ ONE
    // Lit un enregistrement par son id et vérifie les données.
    // ============================================================
    runner.addTest("readOne() — lire un enregistrement par id", function (done, fail, assert) {

        idb.readOne(STORE_TEST, SAMPLE_RECORD_1.id, function (record) {

            try {
                // L'enregistrement doit être trouvé
                assert.notNull(record,
                    "L'enregistrement id=" + SAMPLE_RECORD_1.id + " doit exister");

                // Vérifier les champs clés
                assert.equals(record.id, SAMPLE_RECORD_1.id,
                    "id doit être " + SAMPLE_RECORD_1.id);

                assert.equals(record.regime, SAMPLE_RECORD_1.regime,
                    "regime doit être '" + SAMPLE_RECORD_1.regime + "'");

                assert.equals(record.anneeAcad, SAMPLE_RECORD_1.anneeAcad,
                    "anneeAcad doit être '" + SAMPLE_RECORD_1.anneeAcad + "'");

                done();
            } catch (err) { fail(err); }

        }, function (err) { fail(new Error("readOne() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 6 — READ ONE INEXISTANT
    // Vérifie que readOne() retourne null pour un id inexistant.
    // ============================================================
    runner.addTest("readOne() — retourner null si id inexistant", function (done, fail, assert) {

        let idInexistant = 99999;

        idb.readOne(STORE_TEST, idInexistant, function (record) {

            try {
                assert.isNull(record,
                    "readOne() doit retourner null pour id=" + idInexistant);
                done();
            } catch (err) { fail(err); }

        }, function (err) { fail(new Error("readOne() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 7 — READ ALL (vide + un élément)
    // Insère un deuxième enregistrement et vérifie readAll().
    // ============================================================
    runner.addTest("readAll() — lire tous les enregistrements", function (done, fail, assert) {

        // Insérer un deuxième enregistrement
        idb.create(STORE_TEST, SAMPLE_RECORD_2, function () {

            // Lire tous les enregistrements
            idb.readAll(STORE_TEST, function (records) {

                try {
                    assert.notNull(records, "readAll() ne doit pas retourner null");
                    assert.equals(records.length, 2,
                        "readAll() doit retourner 2 enregistrements");
                    done();
                } catch (err) { fail(err); }

            }, function (err) { fail(new Error("readAll() a échoué : " + err)); });

        }, function (err) { fail(new Error("create() RECORD_2 a échoué : " + err)); });
    });

    // ============================================================
    // TEST 8 — UPDATE
    // Modifie un champ et vérifie que la modification est persistée.
    // ============================================================
    runner.addTest("update() — modifier un enregistrement existant", function (done, fail, assert) {

        // Créer une version modifiée de SAMPLE_RECORD_1
        let updated = {
            id          : SAMPLE_RECORD_1.id,
            idEnseignant: SAMPLE_RECORD_1.idEnseignant,
            idDiscipline: SAMPLE_RECORD_1.idDiscipline,
            idClasse    : SAMPLE_RECORD_1.idClasse,
            regime      : "Anglophone",     // ← champ modifié
            nbreHeures  : 6,                // ← champ modifié
            anneeAcad   : "2025-2026",
            portee      : "ETABLISSEMENT"   // ← champ modifié
        };

        idb.update(STORE_TEST, updated, function () {

            // Relire pour vérifier que les modifications sont bien là
            idb.readOne(STORE_TEST, SAMPLE_RECORD_1.id, function (record) {

                try {
                    assert.notNull(record, "L'enregistrement doit toujours exister");

                    assert.equals(record.regime, "Anglophone",
                        "regime doit être 'Anglophone' après update()");

                    assert.equals(record.nbreHeures, 6,
                        "nbreHeures doit être 6 après update()");

                    assert.equals(record.portee, "ETABLISSEMENT",
                        "portee doit être 'ETABLISSEMENT' après update()");

                    done();
                } catch (err) { fail(err); }

            }, function (err) { fail(new Error("readOne() après update() a échoué : " + err)); });

        }, function (err) { fail(new Error("update() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 9 — COUNT
    // Vérifie le comptage des enregistrements.
    // ============================================================
    runner.addTest("count() — compter les enregistrements", function (done, fail, assert) {

        idb.count(STORE_TEST, function (total) {

            try {
                // On doit avoir 2 enregistrements (RECORD_1 + RECORD_2)
                assert.equals(total, 2,
                    "count() doit retourner 2 après 2 insertions");
                done();
            } catch (err) { fail(err); }

        }, function (err) { fail(new Error("count() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 10 — DELETE
    // Supprime un enregistrement et vérifie qu'il est bien parti.
    // ============================================================
    runner.addTest("delete() — supprimer un enregistrement", function (done, fail, assert) {

        idb.delete(STORE_TEST, SAMPLE_RECORD_1.id, function () {

            // Vérifier que l'enregistrement n'existe plus
            idb.readOne(STORE_TEST, SAMPLE_RECORD_1.id, function (record) {

                try {
                    assert.isNull(record,
                        "L'enregistrement doit être null après delete()");

                    // Vérifier que le store contient maintenant 1 élément
                    idb.count(STORE_TEST, function (total) {
                        try {
                            assert.equals(total, 1,
                                "count() doit retourner 1 après delete()");
                            done();
                        } catch (err) { fail(err); }
                    }, function (err) { fail(err); });

                } catch (err) { fail(err); }

            }, function (err) { fail(new Error("readOne() après delete() a échoué : " + err)); });

        }, function (err) { fail(new Error("delete() a échoué : " + err)); });
    });

    // ============================================================
    // TEST 11 — DELETE INEXISTANT
    // Vérifie que delete() sur un id inexistant ne plante pas.
    // ============================================================
    runner.addTest("delete() — id inexistant ne doit pas planter", function (done, fail, assert) {

        let idInexistant = 99999;

        idb.delete(STORE_TEST, idInexistant, function () {

            try {
                // Aucune erreur → comportement attendu
                assert.isTrue(true, "delete() id inexistant ne doit pas planter");
                done();
            } catch (err) { fail(err); }

        }, function (err) {
            fail(new Error("delete() id inexistant a levé une erreur : " + err));
        });
    });

    // ============================================================
    // TEST 12 — READ ALL APRÈS CLEAR
    // Vide le store et vérifie que readAll() retourne un tableau vide.
    // ============================================================
    runner.addTest("readAll() — retourner tableau vide après clear()", function (done, fail, assert) {

        idb.clear(STORE_TEST, function () {

            idb.readAll(STORE_TEST, function (records) {

                try {
                    assert.notNull(records, "readAll() ne doit jamais retourner null");
                    assert.equals(records.length, 0,
                        "readAll() doit retourner un tableau vide après clear()");
                    done();
                } catch (err) { fail(err); }

            }, function (err) { fail(new Error("readAll() a échoué : " + err)); });

        }, function (err) { fail(new Error("clear() a échoué : " + err)); });
    });

    // ----------------------------------------------------------
    // Lancer tous les tests
    // ----------------------------------------------------------
    this.run = function () {
        runner.run();
    };
};


// ============================================================
// LANCEMENT AUTOMATIQUE des tests au chargement du fichier
//
// Les tests démarrent après que jQuery est prêt, ce qui
// garantit que tous les fichiers tools-3.5 sont chargés.
// ============================================================
$(document).ready(function () {

    // Délai court pour laisser le framework s'initialiser
    setTimeout(function () {
        console.log("[IDBManager.test] Lancement des tests...");
        let suite = new tools.Library.IDBTest();
        suite.run();
    }, 500);
});
