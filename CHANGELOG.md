# [0.4.0](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.3.1...v0.4.0) (2026-05-04)


### Bug Fixes

* **actor:** correct getAbilityBonus() calculation (Bug [#44](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/44)) ([127fa80](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/127fa804a439a9275cf00b197f6040da82d669f3))
* **armor:** correct armor data mapping and add new properties ([880888a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/880888a4b787d6e75bc7da2ab16e6e09f2942549))
* **documentation:** update agent key in GitHub issues feature prompt ([6739c1a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/6739c1ad1c548eb5a298797fd35c3b92fa344c91))
* **import:** corriger des statistiques d'importation pour les carrières et les espèces avec validation stricte ([566bf17](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/566bf17f074d80d27f818741d4b86a51defe2c64))
* **importer:** ajouter un plan de correction pour le mapping des talents OggDude, incluant des exigences et des étapes d'implémentation ([5c481d0](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5c481d048f20791e180df4ad2a4050ba73973253))
* **importer:** correct gear data mapping for OggDude import ([7233a21](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7233a217ee355ca946cfd55ba412b7e76fb757d3))
* **importer:** correct weapon data handling and mapping issues ([f90e1ca](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f90e1caa57c284bb2fb869fecb6308b7c2a48878))
* **importer:** correct weapon data mapping from OggDude XML ([bb2f709](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/bb2f7097380c930df7d891e2f2b41f9ee942a8b2))
* **importer:** corriger la mise en forme de la phase d'implémentation et ajouter une nouvelle ligne à la fin du fichier ([bd96a68](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/bd96a68c2e8bf31f4b6ef068b9200708e30d805f))
* **importer:** enhance gear import mapping and sanitization logic ([98c27d4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/98c27d46463068954e4e6561f0543439da91be26))
* **importer:** enhance talent import mapping with die modifiers and sanitation ([f2d9b59](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f2d9b59a3abb7f40a3e0b58d63499886863e4a40))
* **importer:** enhance talent import mapping with die modifiers and sanitation ([54c8789](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/54c8789c1857736d52322a48dd3eef8af3559ef9))
* **importer:** enhance weapon import mapping and data handling ([84fbb35](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/84fbb35cdf912d9fee07f566d83c9c1be6f28858))
* **importer:** fix issue between this and static method class ([f39ac7f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f39ac7f96715ea0d70f77d548e8493dded494af7))
* **importer:** fix toggle for importing to Compendium ([a8d7787](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a8d7787de187ec830f9271c5752350f3a5dec181))
* **importer:** improve weapon data sanitization and mapping logic ([5018c4e](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5018c4e32db79e03ed3beba0b91d34e119e82f1d))
* **importer:** rename armor data mapping documentation file for consistency ([f5fd839](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f5fd8399d86aecdd383703a7d3501b1e3df750e9))
* improve error handling and validation in SwerpgBaseActorSheet ([5b4956c](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5b4956c7e86528bb4563bde090a8dc8b63571a8e))
* **motivation-category-ogg-dude:** update default icon path for motivation categories ([b43ce26](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b43ce26940469af7be0fedd3b9e1c47d72900434))
* **oggdude-import:** fix tests - update domain length in importer tests ([0aeefb4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/0aeefb4aa265ed56bee2018e8309beb819f69c73))
* **playwright:** correct username casing in E2E configuration and tests ([82c2fb6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/82c2fb6adef86ccf84efe1fa3ff6d8c4b06f714d))
* **playwright:** enhance E2E test stack with admin authentication and viewport configuration ([50aebb6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/50aebb6f91fa051632613f590aa14b3066e277e5))
* **playwright:** update teardown functions for improved logout handling ([9cc4efe](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9cc4efe08a7bd00f4b5cf77b45a26dfe291e1344))
* Remove dead spellcraft system (Issue [#52](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/52)) ([8c29a6b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8c29a6b69a98bb09bbbbf33ed9eab186ea2a20fe))
* **styles:** use auto height for combat telemetry section to prevent overlap with characteristics ([f133521](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f133521f48a8bd36af2744ef48bf9da611b65f35))
* **talent-tree:** handle undefined pack documents gracefully ([8f80c41](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8f80c410c124d1522a352ae0f0da1a901a57388f))
* **talent:** add talent domain to OggDude data importer and enhance mappings ([c13db24](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c13db24ba10fae28b5133111acf62af6c5b6851e))
* **tests:** Add debug data to waitForURL conditions for improved stability in Playwright tests ([4cad6c4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/4cad6c4fc8273eaba3e6245ffc8d8f8b26ebc50d))
* **tests:** correct URL validation logic in enterGameAsGamemaster function ([0bcd4b1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/0bcd4b16a5be32d81ef481753eb9157954552af9))
* Update default image path for motivation categories. ([60db3c2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/60db3c2f70ecb4eba1d1c89deca299009b3fc702))


### Features

* Add armor import mappings and utilities for OggDude integration ([1fc53f2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1fc53f2275c81ffb33c837036b37b19110362b10))
* Add comprehensive architecture documentation for OggDude import implementation ([a955b5b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a955b5b9f1e0da86f252c55a429c86395c746a65))
* Add comprehensive coding style guide for SWERPG (Foundry VTT v13+) ([8fd88d5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8fd88d516e167f8b79d3c46eb28e5a3cbc9d13e1))
* Add comprehensive prompts for implementation plans, README generation, specifications, OO component documentation, JavaScript/TypeScript testing, memory management, code review, and coding standards documentation ([e068870](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e0688707c68e210a9b89e1f60585c8b2e8886ab9))
* add motivation category SVG icon ([3add4f0](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3add4f067da9bdd13a7522d894da836c3d4e79bf))
* add preview functionality to OggDudeDataImporter with pagination and filtering ([5101b7a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5101b7a31c6a2dea7a588e5d216d16a41f934e4e))
* Add weapon mapping tables and utility functions for OggDude integration ([b3452c4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b3452c45e3077e2c3331cebfeb38b502f932c8e9))
* **adr-generator:** Ajout d'un agent pour la création d'Architectural Decision Records (ADRs) avec un format structuré ([e33c298](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e33c298f18abfd50c1a6b8b0ded2b8d96bf8c9f7))
* **agent:** add SWERPG Core Dev Agent documentation ([12b4a3d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/12b4a3d49be1937d553d4f5f4e95d6afdf5546b2))
* **agent:** add SWERPG implementation plan agent documentation ([f1dbb51](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f1dbb51de3bcdaf18f54adf9f903333b7fa2cfff))
* **agent:** add SWERPG Test Dev Agent documentation ([9ca7b5b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9ca7b5bb9b026a7967a32230ea1d9d0ebd2ecd00))
* **agent:** ajouter un agent de fonctionnalité SWERPG pour l'implémentation dans Foundry v13 ([8a73f68](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8a73f68ca3f6e72a3ec7493ae3d434964b111644))
* **agent:** update model version to GPT-5.1 for enhanced capabilities ([9e1e43c](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9e1e43cd3ee6fa0576b0092c0bed4ca0d6598763))
* Ajout d'une gestion des erreurs dans base-actor-sheet.mjs et mise à jour des messages d'erreur en anglais et en français ([502682b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/502682bb54fdad71cdad5a78e8f03cd93d7bbfa4))
* Ajout de la configuration ESLint et Prettier, remplacement de Gulp par un nouveau fichier de configuration pour la compilation LESS ([03bcc1f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/03bcc1f06d952429bdb5f7ee7b1e224e8c6ae33c))
* Ajout de la documentation pour la migration des appels de logging vers logger.mjs ([4d3e25b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/4d3e25b21bb15de148e06d97f5d590710068db1a))
* Ajout de la documentation pour le processus de création du plan de tâches et intégration du prompt de rédaction de tâches ([ccf3a06](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ccf3a0689c1cf703005360bb720e8511035cd459))
* **bugfix:** ajouter un plan d'implémentation pour résoudre l'erreur "c.lookupProperty is not a function" dans OggDude Data Importer ([5a45063](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5a45063c48ca712706060d4c491e0b54fe04c34e))
* **career-mapper:** implement strict skills validation and enhance XML parsing for career imports ([f6e6cb5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f6e6cb5694c0088c343adc669e635c33b3a8a4be))
* **chatmodes:** Add comprehensive chat modes for various development tasks including blueprint, debug, janitor, planner, playwright tester, principal software engineer, research technical spike, specification, typescript MCP expert, and WG code sentinel ([75099ec](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/75099ecbf76be7b5673acc2746e1ab31cc35d1da))
* **ci:** ajouter l'installation de pnpm dans le workflow de tests OggDude ([e4ee88d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e4ee88ddca9861185ca203cb961f28e778ca977a))
* **ci:** améliorer la mise en cache de pnpm pour des performances optimisées ([ddc9bfa](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ddc9bfa4ae911aa226d9c10e31b541a124b3e147))
* **ci:** enhance GitHub Actions workflow with pnpm setup and caching ([59c6793](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/59c6793137678cc9076e688ea53d9eb8d1380a75))
* **docs:** add SWERPG implementation plan and project instructions ([754cb92](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/754cb92232876595d987f08d1d05c6a0ffd2a46d))
* **docs:** add SWERPG regression test implementation plan and guidelines ([4bad80f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/4bad80fe45f5f4875bc0fa71ff539e7e8343a1cb))
* **docs:** ajouter des instructions sur les particularités des templates Handlebars et la gestion des statistiques d'importation ([9da0115](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9da011584f41900e0e6eaa58cb8ddb9cbccc2162))
* **docs:** ajouter des sections sur l'organisation des dossiers et la séparation du code dans le guide de style ([b6c2841](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b6c28411433d675f323a4945b130e47c21bab163))
* **docs:** introduce new coding style guide for SWERPG agent and remove old guide ([4e70c88](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/4e70c88089316b31b18dd2d34e053b54d8dc3b2c))
* **docs:** mettre à jour la documentation pour le système SWERPG et ajouter un guide d'implémentation des tâches ([49acff7](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/49acff7a908fddcead4df517e8d6e2a4208dda9b))
* **docs:** mettre à jour le guide de style avec des précisions sur l'organisation des dossiers et le logger ([8cc1153](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8cc1153a8aafa3d2698e00d3a99f0082381ed2b4))
* **documentation:** ajout d'un plan de refactorisation des sheets swerpg pour améliorer la cohérence et corriger les violations architecturales ([90cfdb4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/90cfdb40984dd85b5d4591ee2b562ae63a4b550b))
* **documentation:** Ajout de documents d'évaluation et de plan de développement pour améliorer la couverture de code et la gestion de la dette technique ([1f1d1f3](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1f1d1f380dd6136b573518f9f9ff46e09897be42))
* **documentation:** Ajout de la documentation complète de la stratégie de tests pour le système SweRPG ([53ad562](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/53ad562b380e4b2a8dd1b2b7b96c8b5bd4ae669b))
* **documentation:** ajouter des sections sur le mocking des librairies externes JSZip et xml2js pour les tests ([501c271](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/501c27115f42eaf376d2bdac3d0d9298dafdb583))
* **documentation:** mise à jour de la stratégie de tests avec des recommandations sur le mocking et l'enrichissement des mocks ([1df6067](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1df606766ab6bd32e27e2d4d2eac6947f3252a16))
* **documentation:** update implementation plan guidelines for issue creation and branch naming ([0f33e08](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/0f33e08774b4c0393a255ff19511b9ebe172435e))
* **duty:** add duty item support and import functionality ([2f682f6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2f682f6ec2023bfcdafd62669fe96def86bd067c))
* **duty:** add SVG representation for duty item ([94d08e6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/94d08e6341cabb9b04a7f5568864b0fdca697549))
* **e2e:** complete stabilization of Playwright tests on Chromium ([2ab34ea](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2ab34eaf671fafa9692e86ecceec27c2d0aa6c26))
* **errors:** Ajout de nouveaux messages d'erreur pour une meilleure gestion des exceptions dans SWERPG ([99d5ebb](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/99d5ebb855d496f6bcef66e35d844420df48d65c))
* Implement OggDude talent import feature compatible with SwerpgTalent model ([54a330d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/54a330d961c3af7a7d0fce9f3893908a31104fce))
* Implement Phase 1 of swerpg sheet refactor ([d46753e](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d46753e522f053d8e85d33047f6d6eac2931626c))
* Implement responsive sidebar for Current Equipment ([eb5e176](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/eb5e176857d48d951d12dc35457e4b4d30076342))
* **import:** ajouter des statistiques d'importation pour le mappage des talents OggDude ([6266e1a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/6266e1a0a5c40e76e9af42ee3cad03ad09d9719b))
* **import:** ajouter des utilitaires de statistiques pour l'import OggDude et améliorer la validation stricte ([ef46fe4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ef46fe4c2563bf15cdd10bfb1fd878f19860d971))
* **import:** ajouter un formatage lisible des durées pour les métriques d'importation ([dc69baf](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/dc69bafd6059e8997d4cbde97ec8f66f316a3dfe))
* **import:** ajouter une jauge de progression globale dans l'interface OggDudeDataImporter ([263a6ef](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/263a6ef158edea1293cd894ee2419eff609787ff))
* **import:** ajouter une jauge de progression globale dans l'interface OggDudeDataImporter ([2beb018](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2beb0180f20fe59346e93bcec48acaa9c5511813))
* **import:** améliorer le mappage des talents OggDude avec gestion des erreurs et statistiques d'import ([86bc09a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/86bc09adec7eee8453a3244b09103e633d157fa9))
* **importer-memory:** ajouter des instructions détaillées pour l'import OggDude, y compris l'instrumentation, la génération de gros XML et la gestion des statistiques ([f01c461](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f01c461c42b8ac41680dc995177ce44e22abab9d))
* **importer:** add "Select All" option for domain selection in OggDude import ([eadce46](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/eadce46c37756046dd871725af60c2a52a4bd4e7))
* **importer:** add deterministic folder colors for OggDude imports ([ecf8e10](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ecf8e1037333e91aac3011bd769c89acff033384))
* **importer:** add diagnostic guide for OggDude specialization import ([7c01fb5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7c01fb5f1dcdedd3545b022548a04b4f8791df22))
* **importer:** add hierarchical folder organization for OggDude imports ([605e0f7](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/605e0f739fa2434e0a4f00adb462361b88fe32ec))
* **importer:** add import option for items to Compendium with hints ([24f45c4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/24f45c45e3e3918f87dc3043c97519db4ca9f5e4))
* **importer:** add new item type import plan for OggDude integration ([4d414e1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/4d414e1ab73ee01d0372957e8bc011b56919d57e))
* **importer:** add obligation domain support for OggDude integration ([3623b35](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3623b35ec0a3493a8926cf90b883eb8832be264e))
* **importer:** add OggDude import option for compendium integration ([284c17b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/284c17b1ad93182da633943f3b47a07ffd3613b8))
* **importer:** add support for new OggDude career skill codes ([7d8e484](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7d8e484ddbc1ea9ff2277ae99c16581eaf1daf90))
* **importer:** add support for new OggDude career skill codes ([ae74c08](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ae74c08073d9bf2ec261df69a7c79fdb1732cfc8))
* **importer:** add support for OggDude specialization data import ([76a1d5a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/76a1d5acf2acf293c1d876d7f227407fe1020fcf))
* **importer:** add support for OggDude specialization domain ([023aa47](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/023aa474788488ff7fb7d7a0d5f73bc50916b715))
* **importer:** add support for OggDude specialization items import ([1fb780b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1fb780ba3c90502507d1a9c0963768571f7b518d))
* **importer:** ajout d'icônes de statut par domaine dans les statistiques d'import avec calcul déterministe et accessibilité ([8ba49ee](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8ba49eed8dfdd82565b46d4adf12d77ca06840c9))
* **importer:** ajouter la documentation et les tests pour l'importation des armes OggDude ([5d48b8d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5d48b8d769b31a9d0a2453cfef56dc590d15db7a))
* **importer:** implement error isolation for OggDude specialization import documentation ([f5dc0a2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f5dc0a283106792971031abfa0bb191c168c59f2))
* **importer:** implement generic loop for OggDude importer stats table ([2726977](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2726977e463dff4fb462e28356da8fbcab38138f))
* **importer:** Implement OggDude talent mappings and utilities ([2699c19](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2699c196402ee94d213ea0033e844dbea4682224))
* **importer:** reorganize OggDude imports into hierarchical folders by item type ([3a1c4db](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3a1c4dbd62771ce4dc8f62a581928b707a29a5d2))
* **importer:** UI immersive OggDude (résumé + sections repliables) ([82a882c](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/82a882c7f2aa0e073e6a6ae94b3bfc8fce8a2806))
* **importer:** update folder colors for OggDude imports to enhance visibility ([42647d9](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/42647d995936d47598cba1f685fb1d6971fb6ef7))
* **import:** make OggDudeDataImporter form scrollable for better usability ([6226c03](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/6226c03cc583b969e5075530a1ed7e616d3fa609))
* **import:** mise à jour des mappages OggDude pour les activations, prérequis et rangs des talents ([e4edcbf](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e4edcbfaa42d666da5f7842068f11459c4b32b16))
* **import:** préserver les statistiques du dernier import et rafraîchir l'UI automatiquement après l'import ([e3a60e0](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e3a60e00c5dedd5f60d7fc6ee9aca90df303074d))
* **instructions:** ajouter des directives pour la gestion de l'UI et de l'i18n dans l'importateur OggDude ([bff9420](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/bff9420be57ff753024d7a15bfd330d7996d7117))
* **instructions:** ajouter des leçons et des exemples pour l'agrégateur de métriques OggDude et les stratégies de test ([3fe1f0d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3fe1f0dfa9c2a651c5554dc6c57b44dc57667a53))
* Introduce motivation category item type with data model, sheet, and OggDude import support. ([1df7a62](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1df7a6225389062c68ed84e4ec2fb2e2c62191f2))
* **logger:** ajouter un module de logging centralisé avec gestion des niveaux de log ([45b4fab](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/45b4fab3992d73b715c56a9c294da32cdbf994fc))
* **logger:** import logger utility and enhance logging policy application ([3682ca6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3682ca658c43dcf0018bde35d4eafbce56a6a5fb))
* **logging:** Migrate legacy console logging to centralized logger ([724be94](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/724be948416920d50c3ddb4bb95d78c3d3d13243))
* **logging:** migration vers un logger centralisé et mise à jour des pratiques de logging ([2cdf943](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2cdf943b1c1159ceeb823f3825d35e0d042bfbd4))
* **logging:** migration vers un logger centralisé pour les importateurs et le parseur XML ([241ffbf](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/241ffbfb691fa9bfda4560d57ce5c90ce4c58591))
* **logging:** Nettoyage des importations de logger dans plusieurs fichiers ([dbefd75](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/dbefd75d25b515417226627ef086c729a07c84e3))
* **metrics:** ajouter des helpers de formatage pour les métriques d'import et mettre à jour l'affichage des statistiques ([5b8c0f9](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5b8c0f9a999acba47e73bd61b2df136f26777c3b))
* Migration de SkillPageSheet vers ApplicationV2 et ajout de la documentation pour la conformité CSS/HTML ([92552fb](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/92552fbbf0a0f8d70fecf46ee698c199cfcbd7f9))
* Mise à jour de la description de l'agent de développement et ajout du fichier agent Task Writer pour le système SweRPG ([263d3bc](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/263d3bc54eebfa25dfd18516bfb053c8abc661f4))
* **module:** add weapon and armor exports to module ([82c2cb5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/82c2cb53373fe93398ee1ddaa478bb791f160405))
* **motivation:** add import statistics for motivation and motivation category ([8c0aa3e](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8c0aa3e67c9d500265733a827905a1cd3d5a4a00))
* **motivation:** add import support for OggDude motivation items ([42a769c](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/42a769cab7c849e29b7caf292ec7ea1df3aae89b))
* **motivation:** add motivation data loading option in localization files ([e1a837f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e1a837f8b613dd7a3d2b3f3d130d9f93614eb78a))
* **motivation:** add motivation sheet and template for user input ([2b68c28](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2b68c28dadaa9ab40b95230da649261de7fc4ac4))
* **motivation:** add SVG icon for motivation items ([3d94103](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3d9410388bac78907ab711f49d025696d6328962))
* **motivation:** add SwerpgMotivation model registration for item motivation ([db580f7](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/db580f767e2646d4821ef3a5aa478d2dc7111b0a))
* **motivation:** update image path for motivation items and use dynamic path builder ([d2b17ed](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d2b17ed11c10d2d05191c3e65f1f93bf9a5e8ed9))
* **motivation:** update image path for motivation items and use dynamic path builder ([a76f9af](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a76f9afb7dd214bb53df3d9ab115c1c269282e1e))
* **oggdude-import:** add import statistics documentation ([7b521a3](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7b521a3365ff1b0d077f290af5dd2336d9216c32))
* **oggdude-import:** add OggDude data importer functionality ([da2ec25](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/da2ec25edf157706129c0101d8663bf876594add))
* **oggdude-import:** ajouter des statistiques d'import et des métriques globales, améliorer l'interface utilisateur pour afficher les résultats d'import ([ed8eb7a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ed8eb7ac7f411f5dc92fb87596da44e9c08dc33f))
* **oggdude-import:** ajouter des tests unitaires et d'intégration pour OggDude, améliorer la couverture des tests et configurer CI dédiée ([74230dd](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/74230dd7d380847498d7e1842cdd35078b34d802))
* **oggdude-import:** ajouter l'importateur de données OggDude avec validation de sécurité et tests unitaires ([fa36e15](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/fa36e15074f89541fa673ab8a74a7f71613e343d))
* **oggdude-import:** ajouter un plan d'implémentation pour finaliser l'import OggDude avec tests et observabilité ([2927337](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/2927337308aa33e8391f7571a180817ca85b946b))
* **oggdude-import:** améliorer l'import OggDude avec gestion des erreurs, indicateurs de progression et mise en cache des images ([d707482](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d707482a3ccdb44b47598225997f4c76b435d8eb))
* **oggdude-import:** enhance species mapping to align with SwerpgSpecies model ([a59004d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a59004d0260408cd0a02805fcaf944b6e9c3500e))
* **oggdude-import:** finaliser les tests d'import pour armor et weapon avec statistiques d'import ([0656839](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/06568392d1e4fb7f3fea8ee8ed12057542cafe1b))
* **oggdude-import:** mettre à jour le statut de l'implémentation et supprimer les références `this.` dans le template Handlebars pour la compatibilité avec Foundry v13 ([6d5cfb1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/6d5cfb10f0292eed868951164e532140847f0b1f))
* **oggdude-import:** refactor career mapper to align with SwerpgCareer schema ([dcf7c41](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/dcf7c4166e1eb943586485e5c32d3ad1206f5527))
* **oggdude-import:** refactor gear mapper for SwerpgGear compliance and enhance validation ([e1edc97](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e1edc9792e7f094c940556acbe2728b85023ca7a))
* **oggdude-import:** refactor OggDude Weapon mapper for alignment with SwerpgWeapon schema ([a0e07f9](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a0e07f90729d67be35f6adbf01c6d3e4c7dd1c7c))
* **oggdude-import:** remplacer les appels Handlebars non compatibles par des accès directs et ajouter des tests pour vérifier les modifications ([cd9bf9a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/cd9bf9ae9baf72a147c68b93e4e2528590dc1ad8))
* **oggdude-import:** update skill mappings and enhance XML parsing logic ([507b5f1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/507b5f1c2600413fd35ec19aedbc02213aee9e3c))
* **playwright:** add automatic loading of .env.e2e.local in startup script ([e99bf01](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e99bf01956f3db3537630d149e9a4ef7d86bdb3d))
* **playwright:** add CSS selector option for user selection in E2E tests ([eba338b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/eba338b1ca961864f622d7054a9cab2ebc0b85d9))
* **playwright:** add E2E test scripts and task management for Playwright setup ([5aa3405](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5aa3405b4be1a65e8419467d84caec320776a77b))
* **playwright:** add Playwright E2E test stack documentation and helper functions ([034a2b1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/034a2b1753819b47d82d4a58585e1de27237fdf0))
* **playwright:** add Playwright E2E test stack documentation for Swerpg integration ([f66fd39](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f66fd3978491596007d6d02229b0aa94984c5da6))
* **playwright:** add Playwright E2E test stack for Swerpg integration ([7bca2c2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7bca2c28abda6273bce0520b1d9cb60b19eaec27))
* **playwright:** add script for managing Foundry VTT E2E test environment ([05f16a0](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/05f16a05283c73de5239f28de1b83e752b16923d))
* **playwright:** enhance E2E test flow with improved navigation and timeout settings ([c6b47a3](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c6b47a305b7575f6abbe610f68a5d0b050e7373e))
* **playwright:** enhance E2E test setup with ownership and permissions for data directory ([6fd3aef](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/6fd3aef10331562a35d71241363d1d09ee1581c1))
* **playwright:** enhance E2E test workflow with Foundry VTT setup and teardown ([9ef21dc](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9ef21dcb24e8c4cb456de8c14b9555da28485a2f))
* **playwright:** implement setup and teardown functions for E2E tests ([7a38551](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/7a385516690d719366d43f9b6454a50753310da1))
* **playwright:** increase timeout settings for E2E tests to enhance stability ([99817f6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/99817f6705d2a3333a18d3a90e86f7b81d0008a8))
* **playwright:** update E2E test configuration and improve data handling ([5bb8e44](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/5bb8e44598f40f59ee9dc68357d97f87d31d17ab))
* **playwright:** update Foundry VTT setup in E2E tests with improved data handling ([f9707c5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f9707c53a1189c5793c0eefe37a4bf8093908d08))
* **playwright:** update GitHub Actions workflow for E2E test execution ([55ab52d](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/55ab52d056824e1ffb3606ddf3fbfb7c3ef98eb5))
* **prompts:** Ajout de meilleures pratiques pour les tests unitaires XUnit, y compris les tests basés sur des données ([d83e2bd](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d83e2bd2af55c140f2062cfe99c6baaef568e3bc))
* **prompts:** Ajout de nouveaux prompts pour la création de documents de spécifications de produits et la gestion des problèmes ([bdd7c1a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/bdd7c1a18c1ea1dfaa3bc9e4be0702ce84cdf888))
* **prompts:** Ajout de nouveaux prompts pour la recommandation de modèles AI et la génération de messages de commit conventionnels ([1c96a39](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1c96a390d4129c74f4e8d3981e3c4aa9b7c1bcfa))
* Refactor SkillPageSheet en SkillSheet et mise à jour de l'importation de SwerpgBaseItemSheet ([9bd6dab](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/9bd6dabf15514e2c2151991238c82deb1d97a5c0))
* **release:** update release process to include system.json and changelog updates ([89629c5](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/89629c5324fd4ab7c7ebecffe98f7468605154bb))
* **sheets:** ajouter la phase 3 - Factorisation et Optimisation des méthodes communes ([34d028e](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/34d028e13f2c27e42eb9395cf5ebb16babe7c6f7))
* **sheets:** Phase 2 - Consolidation Architecturale ([f219dc2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/f219dc264b52f1fe151675ffd19ba8ab8021f759))
* **svg:** add talent SVG graphic for visual representation ([1ce2e7f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1ce2e7f31f0ecbfe12a0b578ee4986498b5a3bc8))
* **task-writer:** Mise à jour de la description et des principes directeurs pour le mode de développement sécurisé des features ([c89f360](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c89f36041e851879bd2b8986aece7f98b42f7a4f))
* **tests:** add artifact uploads for unit test coverage and Playwright results ([30e0e12](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/30e0e1275661fd82dd263161d65f6bc465d7d5a3))
* **tests:** add beforeAll fixture for enhanced test logging in Playwright ([ddaff2a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ddaff2aa3190b7f70072effede9b76c934e1ab27))
* **tests:** add CI-specific configuration for Playwright E2E tests ([1e54f94](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1e54f94e3c35f627b8e93f3e3bbeaa54a8ce6549))
* **tests:** add overlay dismissal functionality for improved test reliability ([417dd89](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/417dd89eedcdf7eebab3b7356b46b490e3363530))
* **tests:** add screenshot capture for bootstrap and OggDude import tests ([c0d19a7](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c0d19a735a8a5a482b913a5791bb3cebe98e2694))
* **tests:** add validation checks for Playwright E2E tests on join page ([0728b69](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/0728b69501d13e89a96cb717d591a57c7d76e29b))
* **tests:** Ajout d'un helper pour la simulation de l'environnement Foundry et mise à jour des tests ([e439ef4](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/e439ef4efca966912acf61c05447bc5ad8565dd1))
* **tests:** ajout de tests pour les effets et vérifications standard, amélioration des mocks Foundry ([b50e59b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b50e59bffd12a0b34c631e64b771a555af978269))
* **tests:** ajouter des tests pour l'agrégation des métriques d'import et la réinitialisation des statistiques ([a03d627](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a03d62761531831c28f4fd0cf284ed1279a109dd))
* **tests:** améliorer les assertions de tests pour comparer les compétences de carrière en tant que tableaux triés ([b8a018a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b8a018a83d69adb50eac5ac41ec1ef5738f2e3d2))
* **tests:** conditionally disable Firefox configuration for CI environments ([d83fc41](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d83fc41aec2e95d0a821939c56cbd64c33d0c6c2))
* **tests:** Correction du chemin du module logger et ajout d'une fonction utilitaire pour exposer foundry.utils ([783d898](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/783d8988e97fea99918f2fab90a4eb1d3459c82e))
* **tests:** enhance E2E tests with additional assertions and helpers ([b880177](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/b8801778d4cc7a77e927751f7db45096028641b7))
* **tests:** enhance enterGameAsGamemaster function with improved user selection validation ([54d6bfc](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/54d6bfca05b37ac91bf1e994ff08e6cf1211e81e))
* **tests:** implement stability improvement plan for Playwright on Chromium ([d6eab91](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/d6eab911fb3f15c410a525e9a20e2bc95c2e1fce))
* **translations:** add talent loading messages to English and French JSON files ([762ee53](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/762ee539ab867e7e609183db5bdf84d490847261))
* **xml:** add new XML files for reputations, core sources, and careers ([c69c870](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c69c8701a31537fbc988979f7e730ce09cd90d7f))

# Changelog for FoundryVTT SWRPG System

> This file contains the changelog for the FoundryVTT SWRPG system, detailing all changes, bug fixes, and new features introduced in each version.

## [Unreleased]

### Added

- **importer:** new armor OggDude mapper with deterministic category/property mapping tables
- **importer:** armor import validation system with strict mode support
- **importer:** armor import statistics and instrumentation (total, rejected, unknown categories/properties)
- **importer:** comprehensive test coverage for armor mapper (>95% branch coverage)
- **docs:** complete armor import documentation with examples and troubleshooting
- **importer:** gear OggDude mapper refactored for SwerpgGear schema compliance
- **importer:** gear import validation functions with numeric and boolean normalization
- **tests:** comprehensive unit and integration tests for gear mapping (13 tests total)
- **docs:** complete gear import technical documentation
- **importer:** specialization domain fully integrated in OggDude import UI and backend pipeline
- **tests:** unit tests for specialization domain support (OggDudeDataImporter.specializationSupport.spec.mjs)
- **tests:** comprehensive unit tests for specialization mapper (9 tests covering valid/invalid cases and edge cases)
- **importer:** extensive diagnostic logging in specialization mapper (start/end/per-item tracking)
- **importer:** diagnostic logs in OggDudeDataElement.processElements for mapper execution tracking
- **importer:** diagnostic logs in oggDude.mjs processOggDudeData for context validation
- **docs:** plan de correction import spécialisation dataset vide (bug-oggdude-specialization-empty-dataset-1.0.md)
- **docs:** requirements EARS fix import spécialisation (OGGDUDE_SPECIALIZATION_IMPORT_FIX_REQUIREMENTS.md)
- **docs:** design correction import spécialisation (design-specialization-import-fix.md)
- **docs:** tasks list correction import spécialisation (oggdude-specialization-import-fix.tasks.md)
- **docs:** ADR-0006 isolation erreurs par item spécialisation (adr-0006-specialization-import-error-isolation.md)

### Changed

- **importer:** refactor armor-ogg-dude.mjs to produce SwerpgArmor-compatible objects
- **importer:** sanitize armor descriptions to prevent HTML injection
- **importer:** clamp armor defense/soak values to [0,100] with abnormal value warnings
- **importer:** sort armor properties alphabetically and limit to 12 properties max

### Removed

- **importer:** removed unsupported armor fields (sources, mods, weaponModifiers, eraPricing) from output

### Fixed

- **importer:** refactor career OggDude mapper to align with `SwerpgCareer` schema (description, freeSkillRank clamp, careerSkills normalization, logging)
- **importer:** correct OggDude gear mapping to restore numeric fields, enriched description, BaseMods serialization and weapon profile flags
- **importer:** add missing "Load Specialization data" row in import statistics table (oggDudeDataImporter.hbs)
- **importer:** add diagnostic logs in processOggDudeData and \_prepareContext for easier troubleshooting of domain registration issues
- **importer:** add comprehensive error handling with try/catch in specialization mapper to prevent silent failures
- **importer:** add validation logging in extractRawSpecializationSkillCodes for CareerSkills structure debugging
- **importer:** add per-item error handling in specializationMapper to isolate mapping failures

## [0.3.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.3.0...v0.3.1) (2025-06-16)

### Bug Fixes

- **changelog:** update version headers for consistency ([474c53b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/474c53b27f484160d5649bf8b3218ca4e19af4be))

## [0.3.0](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.2.1...v0.3.0) (2025-06-16)

### Features (0.3.0)

- **actor-sheet:** display currently equipped armor and weapons in sidebar with tags and toggle control (planned feature implementation)

- **armor:** modify armor to be valid with SW rules (migration from crucible). ([689bec2](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/689bec250c24877b4638cb057d9fd7851123ddea))
- **weapon:** add gear to system. ([ddf81ed](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/ddf81eda3397af06527d3647487b922f06360e21))
- **weapon:** add weapon to be valid with SW rules (migration from crucible). ([1fb0ee1](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/1fb0ee1f5f979444d8f40d82462ffedd9b45073f))
- **weapon:** add weapon to compendium. ([3ebe282](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3ebe28207a564205dd9f7db747788a5270aa8ef8))

## [0.2.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.2.0...v0.2.1) (2025-06-08)

### Bug Fixes (0.2.1)

- **changelog:** update changelog format and add introductory description ([54be664](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/54be664e866a94e63bde6b8cf64ea1c4511eca14))

## [0.2.0](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.18...v0.2.0) (2025-06-08)

### Bug Fixes (0.2.0)

- **build:** remove unused database entries from build configuration ([a8b7f67](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/a8b7f67c26ba93d3965916d413a668f1845aa8e7))
- **main:** update build command from pullYMLtoLDB to compile ([8c5ab2b](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/8c5ab2bf18e8cdbd95b0803e0e0172d3bb4d37d0))

## [0.1.9](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.8...v0.1.9) (2025-06-04)

## [0.1.8](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.7...v0.1.8) (2025-06-04)

## [0.1.7](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.6...v0.1.7) (2025-06-04)

## [0.1.6](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.5...v0.1.6) (2025-06-04)

## [0.1.5](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.4...v0.1.5) (2025-06-04)

## [0.1.4](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.3...v0.1.4) (2025-06-04)

## [0.1.3](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.2...v0.1.3) (2025-06-04)

## [0.1.2](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.1...v0.1.2) (2025-06-03)

### Bug Fixes (0.1.18)

## [0.1.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.0...v0.1.1) (2025-06-03)

## [0.1.0] (2025-06-03)

## [0.1.17](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.16...v0.1.17) (2025-06-04)

### Bug Fixes (0.1.17)

- **release:** update release.yml to set DOWNLOAD URL directly in environment variables ([373129f](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/373129fc656da94e60130705d7cc8bc89388260e))

## [0.1.16](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.15...v0.1.16) (2025-06-04)

### Bug Fixes (0.1.16)

- **release:** move release_module_url to environment variables in release.yml ([3842d4a](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/3842d4adca4182286de436b29299e6a295147874))

## [0.1.15](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.14...v0.1.15) (2025-06-04)

### Bug Fixes (0.1.15)

- **release:** correct syntax for VERSION environment variable in release.yml ([cf8c408](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/cf8c408e2011b57cfd64b513498eec9445837540))

## [0.1.14](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.13...v0.1.14) (2025-06-04)

### Bug Fixes (0.1.14)

- **system:** update system.json to use placeholders for manifest, download, and version in release process ([2487102](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/248710270b9b533b98cc5ddc8a5789550ef8be08))

## [0.1.13](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.12...v0.1.13) (2025-06-04)

### Bug Fixes (0.1.13)

- **system:** update system.json to use placeholders for manifest, download, and version ([00f7213](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/00f7213cadfa297f5917262e5155fa022cfbf12b))

## [0.1.12](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.11...v0.1.12) (2025-06-04)

### Bug Fixes (0.1.12)

- add styles directory to release.yml for asset inclusion ([dc805ad](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/dc805adb3cfd2cbfe84cbe1c30513a87e91e14c6))

## [0.1.11](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.10...v0.1.11) (2025-06-04)

### Bug Fixes (0.1.11)

- update release.yml to extend semantic-release configuration for improved functionality ([60f95d6](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/60f95d6af2cbf27afed1483544e6ac211ec6c432))

# [0.1.9](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.8...v0.1.9) (2025-06-04)

# [0.1.8](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.7...v0.1.8) (2025-06-04)

# [0.1.7](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.6...v0.1.7) (2025-06-04)

# [0.1.6](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.5...v0.1.6) (2025-06-04)

# [0.1.5](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.4...v0.1.5) (2025-06-04)

# [0.1.4](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.3...v0.1.4) (2025-06-04)

# [0.1.3](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.2...v0.1.3) (2025-06-04)

# [0.1.2](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.1...v0.1.2) (2025-06-03)

### Bug Fixes

- enhance changelog entry matching for better version header support ([c451a54](https://github.com/herveDarritchon/foundryvtt-swerpg/commit/c451a54ceae889441c79065c2c38095a494bfb24))

# [0.1.1](https://github.com/herveDarritchon/foundryvtt-swerpg/compare/v0.1.0...v0.1.1) (2025-06-03)

# [0.1.0] (2025-06-03)

# What's Changed

Feature/refactoring skills during character creation by @herveDarritchon in #1
[TECH] Add github actions from an other fvtt system. by @herveDarritchon in #2
Merge pull request #2 from herveDarritchon/tech/add-github-actions by @herveDarritchon in #3
Add characteristic management to character sheet by @herveDarritchon in #5
Feature/add attribute progression to character by @herveDarritchon in #6
Full Changelog: https://github.com/herveDarritchon/foundryvtt-swerpg/commits/v0.1.0
