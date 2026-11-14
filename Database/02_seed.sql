-- Formiguinha Decola - Dados de teste
-- MySQL 8.x
-- 02_seed.sql
-- Fonte dos alunos: IDs_Formiguinha.xlsx (dados fornecidos pelo grupo).

USE formiguinha_decola;

START TRANSACTION;

-- Usuário de teste para o módulo de acesso.
-- Senha do teste: Formiguinha@123
INSERT INTO usuario (nome, email, senha_hash, ativo)
VALUES
    ('Usuario de Teste', 'teste@formiguinha.local', '$2b$12$omO/eNH86K0OEfAxBmlTTe1ydIqawAOIeaD06oCyrdPqKnUXL.BiC', TRUE);

-- As planilhas fornecidas possuem registros de alunos para estas seis turmas.
INSERT INTO turma (nome_turma, sala)
VALUES
    ('6A', NULL),
    ('6B', NULL),
    ('7A', NULL),
    ('8A', NULL),
    ('9A', NULL),
    ('9B', NULL);

-- Alunos: 191 registros presentes na planilha fornecida.
INSERT INTO aluno (ra, nome, telefone, data_nascimento, id_turma, qr_code)
VALUES
    ('000120887748', 'ALICE DE SOUZA ARAUJO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '47398a38a2fcffc41a69a2becb5e039c'),
    ('000115937766', 'ANA CLARA MENDES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '899e5cb20a0040b380c4425827615502'),
    ('000120863771', 'ANGELO GABRIEL SANTANA SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '6d95ecbd10aeb8dabc697071e17f4784'),
    ('000120837487', 'ARTHUR VIEIRA SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'e969aa9fd9137702a13687061e278991'),
    ('000120832056', 'DAVI AYALA SANTOS CAVALACHE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'fd2967225bf9a88d29f6f1c11c792c63'),
    ('000114237712', 'DAVI DE OLIVEIRA CANASSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'ceb5374f93d26ed2adb698804a8d272d'),
    ('000114321154', 'DAVI FERRI SILVA ABADE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '536b7b45d3206e25178a532ba03f718c'),
    ('000120837171', 'EMILLY FLORA GONCALVES DE FREITAS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '2fbd80d22fd006571683ca6997ebe387'),
    ('000116439844', 'ESTER KETELYN MARCHETTI LUCIANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '9327b1cba0388f0683b0047bdb6fa547'),
    ('000116488394', 'GABRIEL SANTOS PEREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '0c731867598c4dc7cd9116cf9966bb81'),
    ('000125394184', 'HUGO HENRIQUE GOMES FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '4e25a6ea619c7387e215ba0ee536086d'),
    ('000121849149', 'JOAQUIM ELIAS SANTOS TEIXEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'd9fe0081a070e5030383f256703e7472'),
    ('000116666017', 'KAIRO MIGUEL LUCIANO ANDRADE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '8d2664b73e22a9788dc12c70c4bf1bd5'),
    ('000120947783', 'KAYANE FATIMA SOUSA PINHEIRO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'f419cf0807aa3cdb10248e4484c091e3'),
    ('000114321408', 'LAVINYA SOUZA MARIA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '9c746e8a31c5f5ca3aba802e95340b3e'),
    ('000120480298', 'MURIEL PEREIRA DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '29b9da41f18f0e289e071735868c3798'),
    ('000120939685', 'NOEMI LIMA DAVID', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'c2046a655d4372bf98045750de5bc28d'),
    ('000122001619', 'RAFAEL DONIZETE DAMIAO DE SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '1cefae1b541655ce4252817862a57a4b'),
    ('000115944155', 'SOFIA DE PAULA DIAS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'de1f9faea52a0a6470c402c8dbcaf1e5'),
    ('000116676113', 'VALENTINA MELO ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '5e39f4a37d6ddf74372de225447bff8c'),
    ('000120067345', 'WELLINGTON LYNCON PORTELA FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '27cb7fcde20db357552ac4ac8f921890'),
    ('000116413551', 'YNARA GABRIELLY DA SILVA TIBURCIO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '3d03dfde8f56395fdd49aa4a10af1399'),
    ('000125194433', 'KAUAN PASSOS CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), '9a74051f6d70e23c73fb153c5869d8e8'),
    ('000120810630', 'SAMUEL EDNALDO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'e44a5c17946405a590fb06833d7cb92f'),
    ('000120837200', 'STHEFFANYA SOUZA BONIFACIO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'bba1fff71dffbe1cac369a8e473f05ac'),
    ('000120881768', 'JULIANA OLIVEIRA DO CARMO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6A'), 'df215542be5954985edc4120a6fe2971'),
    ('000120232859', 'ANA CLARA MIRANDA DE MOURA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '7e019431bc873cd75a741d60298bf4ac'),
    ('000116412727', 'ARTHUR EMANUEL SANTOS SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '72fe2d06c083263689b5ba1255fa72e0'),
    ('000120229491', 'ARTHUR FELIPE ALVES BADOCO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '233c57e136b65008c5c5537ff13112de'),
    ('000121330427', 'EMANUELLY VITORIA DE SOUSA SANTANA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '3a3749d7c894a108c5f96248b64528a6'),
    ('000121725532', 'ISABELA DE SOUZA VALENTINO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '83fae6d0303e97299f5282c200bc4403'),
    ('000120925761', 'ISABELLY PORTELA NUNES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '2c32970f1a00594836ef083e71036816'),
    ('000116470866', 'JULIA SOPHIA ALVES BARBOSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'aa93af9acfbb0392f46b2fa1f768429d'),
    ('000120837556', 'KATHLLYN MUNIZ PASSOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'cd31f23d89ae500f5decc671ec4f1c37'),
    ('000120837536', 'LAYSLA STEFANYA FERREIRA DE ARAUJO GERMANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '67ee1e196254f1110b89d56da4e82a6d'),
    ('000121088761', 'LUÍS FELYPE FURQUIM DE LIMA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'b1d4c4ff9697db88770c71cf5a52a324'),
    ('000115154927', 'MARCELA KAROLAINY ARAUJO ALMEIDA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '5dc501dc99dc6deb6d8400ec5e49a5c2'),
    ('000120837147', 'MARIA EDUARDA DE MARIA SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'cf1c6301900177911fb50fd78728636f'),
    ('000120012662', 'MARIA LUIZA MOTA RODRIGUES DE MOURA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '8705c34613577912a83a7d2360686e1e'),
    ('000120831849', 'MARIA VICTORIA RODRIGUES CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '8d9b925bf486cec235d6d6b6d0746e4c'),
    ('000121276952', 'MAYSON NUNES FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '7091e8f943356ed3e45de8753fc3134b'),
    ('000116675005', 'MICAELY PEREIRA DE LIMA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '8018f27368bfe1079a53a20590cca9ab'),
    ('000120361682', 'MILENA DE OLIVEIRA SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'e58d211572e3becc30ac302d1a636cf5'),
    ('000121093841', 'THIAGO HENRIQUE SEVERIANO LAURENTINO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'ef17760403d76c15fef65ef5b9dd6d46'),
    ('000116574442', 'VINICIUS SILVA PEREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '400a58d2d0fe4067f73ba09c80f79fb2'),
    ('000114310461', 'VITOR CANCIO SILVA CARNEIRO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '11b3e00b42e19e8edce761d6a1a7eb7b'),
    ('000120837511', 'VITORIA MARIA FERREIRA GERMANO DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '121848aff3386a42da2e9582e6e83d76'),
    ('000122286730', 'WELBERTY GABRIEL OLIVEIRA LIMA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '13ebfc3b63de3f80170c035f62bf3b2d'),
    ('000116380424', 'NÍCOLAS MIGUEL PINHEIRO EVANGELISTA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'ea6d6c21cd97477dc1dc70914dec2415'),
    ('000120413379', 'ISAQUE EMANUEL DOS SANTOS COSTA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), 'b53ffca38940e3c50e8ae75474bf2335'),
    ('000120831894', 'SANTIAGO HENRIQUE FERNANDES GANZAROLI', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '45aaab346c96ff5598c61906319ed85d'),
    ('000123832289', 'MIGUEL AVELINO REIS DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '69eecebe9da2cf9a634cc2988cf63dcf'),
    ('000120837371', 'DANIEL APARECIDO DE SOUZA COSTA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '6B'), '2e6707b0ab8311a03d79b9623f75008d'),
    ('000112511778', 'ANA CLARA BARBOSA DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '469c7d274700ae95ac5d7866c8c9dd2d'),
    ('000120038296', 'ANA CLARA TEIXEIRA DE SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '1e4c6cb4cce930c3bfe36e333755c2c5'),
    ('000116674888', 'ANA KELLY CARVALHO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '81a594fff00cb2018911beb1253c879b'),
    ('000120031329', 'ANA LAURA SILVA DE PAULA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '999f11c979026c0c0f59ff552bda1380'),
    ('000113453261', 'ARTHUR HENRIQUE SOUZA GONÇALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'e3b1d4c9a906662069af031657d8425c'),
    ('000115670755', 'ARTHUR MIGUEL MARCHETTI SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '87e12bb330a15356c010159740ab963b'),
    ('000120041720', 'BRYAN HENRICK INÁCIO MACHADO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '35867bf3ebf8a42651688a6a4ed6baa1'),
    ('000114620357', 'DAVI CANCIO SILVA CARNEIRO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '945bea46cfe33d0a50ca83d5618b10eb'),
    ('000116674961', 'EDUARDO DE PAIVA SOUSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'be9222ea073b4e1b4f711854c4781aff'),
    ('000116674936', 'EDUARDO JUNIOR MARCHETTI LUCIANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'e61ee3da9dff558de14ba914a80e0ef9'),
    ('000116381024', 'EDUARDO SANTOS DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'c4d7b59e20116a5ec90831f0bdc7bc3c'),
    ('000120031347', 'ESTHER VITÓRIA SILVA SOUSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'dd69afd1c74cfb1fd14d9e9595dd5c46'),
    ('000116537769', 'GABRIEL PAIVA PORTO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '521c63dff08ca8d15171da027eab8df9'),
    ('000120031351', 'GABRIELA CAVATON QUINTILIANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '4589c1b45597d8156f77330ecdb6e2ae'),
    ('000116488132', 'HELOÁ MARIA MELO GONÇALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '7a918ca9e0810b2105ab148017ab0fa0'),
    ('000120022302', 'ISADORA FERNANDA FERREIRA AGUIAR', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '846e2f09d87308c65a0847a1c619b2e5'),
    ('000120068832', 'IURY HENRIQUE DE OLIVEIRA ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '04191f62827638e3567e6872ce24acd5'),
    ('000120068875', 'KAUAN RAFAEL DOS SANTOS SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '6d2cd44ff386a78809adfdaeafd0b553'),
    ('000120031369', 'LUIS FELIPE OLIVEIRA SOUSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '50174b74528baa9a058f9d27a37f1d9b'),
    ('000114316942', 'LUIZ MIGUEL SILVA DUARTE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '6d697d4d1a523a7d231c596ad06cf41a'),
    ('000116675152', 'MATHEUS DE OLIVEIRA MENDONCA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'c3cc9a1a8c01f728314973f2f93dc5e4'),
    ('000120031385', 'MIGUEL VINÍCIUS DE CASTRO SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '9078b10d7cff4f5e866176b884887f6b'),
    ('000113453648', 'MURILO GABRIEL SOUZA GONÇALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '60cf67fc75107ca183012776a3795681'),
    ('000116551652', 'NICOLE EDILEIA NUNES RODRIGUES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '1173be73a7a947d20b2d2fd5cd0a8670'),
    ('000120068805', 'RAFHAELLA BEATRIZ DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '717b40de6a2d9c206644851b4269efea'),
    ('000116809612', 'SOPHIA ISABELLY ALMEIDA MENEGHELLI PEREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'f6a4b46946d664cf06838d24ab366f7d'),
    ('000120365131', 'TAYNÁ PEREIRA DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '89487983b9102174ac5588478588c9c7'),
    ('000113453872', 'VINICIUS AUGUSTO SOUZA GONCALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'a273176791428ada948bca7ae1db3b92'),
    ('000120068491', 'WESLEY GIOVANNY VENERANDO ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '1fa45a25182bc2973f020b4129e1d3d4'),
    ('000120837739', 'YASMIN VITORIA CARVALHO DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'e8f9c88ac5d8b4c01105389a66a972ef'),
    ('000113736121', 'NICOLLE CRISTINE SIMOES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'f4f3e93548beccbd4458a3e8a04d13b5'),
    ('000114184745', 'CHINYERE BEATRIZ FLORENTINO OGUEJIOFOR', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '636e3fd5736963c6ee6a5a5ed0587499'),
    ('000120031383', 'MARIA EDUARDA LIMA BLANCO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '8761dcb0a78f6e0a5f4905b76fc05f26'),
    ('000120068614', 'JASMYM MONIQUE VENERANDO ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'bf6c8ffabb6b8727cc3d7edc27b6453d'),
    ('000114185751', 'KAROLAYNE YASMIN DE OLIVEIRA SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), '34176bac9fb9b51b3add89cebeddd1f1'),
    ('000115290998', 'ISABELLY VITÓRIA VIEIRA OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '7A'), 'efaa9d40c4c33e958833bf4515bcbefd'),
    ('000125392373', 'ABMAEL DE OLIVEIRA MONTEIRO MORAES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '5f45c930862d1a9b50827ff096537b91'),
    ('000115991886', 'ALANA SAMARA FREITAS DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '47f76f7bb10d4fd81771359db1daad97'),
    ('000113465570', 'ALEXYA EDUARDA NEVES CASTRO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '0a41bdf170cca69e79b99d1e8f5d5982'),
    ('000114530498', 'ANA SARA ALMEIDA ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'cc0e74b195e948ab33f4fa9e56b653b6'),
    ('000115982878', 'ANNY GABRIELY DE OLIVEIRA FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'cf39c99243d5358bc189f880643034af'),
    ('000116005273', 'ASHLEY VITÓRIA DA SILVA LAURENTINO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'bb2d65f75ac5a046905777190d691af9'),
    ('000114288977', 'AYLA VITÓRIA PAIM MARQUES DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'd68331fc2e59df4107dbb347bff577dd'),
    ('000114347565', 'BREDLEY ROBERT FERREIRA DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '7f6f71c267933c21cfee52936c4146e4'),
    ('000115991898', 'BRENDA GABRIELLY VILAS BOAS CANCIO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'bf67226932973b8ed60ab16290e2a495'),
    ('000114782888', 'DANIEL DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'd7a719db61dc7c23ba0911c3202a65d3'),
    ('000115982901', 'DAVI LUCAS RODRIGUES SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '09f321ca402c91ab112e5bbfbf90989a'),
    ('000112510264', 'ENZO RAPHAEL DE OLIVEIRA SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'c39896575f65fd6e8005333acfbe85e3'),
    ('000116674789', 'KAUAN MESSIAS MORENO MENEGHELLI', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'eccf0d729a7634a9c96ce31fa7cad063'),
    ('000115182130', 'KAYK OLIVEIRA FERNANDES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'feaaa73ec986bdc1578b2ffd97a47835'),
    ('000115690794', 'KETHALLYN VICTORIA VENÂNCIO CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '3f3cd17c907d51da6b77f002e6e0f983'),
    ('000115992391', 'LUAN HENRIQUE OLIVEIRA ANDRADE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '0472ea0d237092ae9e1dc29aa9c30b11'),
    ('000115991405', 'LUNA RAFAELA SILVA DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'd15290f5003a6dab13eb8fdb7b4319cb'),
    ('000113782124', 'MARIA FERNANDA MARCONDES FELICIANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'c8deff631b1e87a5f1d9c231dde78d42'),
    ('000115982706', 'MARIA VITÓRIA ARIFA SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '712846024a232db7c73a27814bcb7011'),
    ('000113689033', 'MIGUEL FERREIRA BARCELOS DE ARAUJO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '76c304455a23af0e91fb0c80f1ef3945'),
    ('000116270206', 'MIKAELA LAURENTINO MARTINS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'da9b247e882cc55c1de14b9ee1f2e1c1'),
    ('000114701216', 'NICOLE CRISTINA MENDES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'aea9e4c96f581e797752d4b559b537a4'),
    ('000116373204', 'PEDRO HENRIQUE OLIVEIRA ARAGONEZ', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '23211bf8dd4fd57fb7eaba261e4467fc'),
    ('000115995446', 'RAFAEL HENRIQUE ALEIXO BENTLIN', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'd20d22e50c2dd3e5417c0380a2130b8b'),
    ('000115130917', 'RAFAELLY DE OLIVEIRA BARBOSA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '97a36ff898fd3dedc7c4acceaef67a91'),
    ('000116264100', 'RAYSSA EMANUELLY CARVALHO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '80be87f7ad37183a27ce6317b8024c2b'),
    ('000115984358', 'SOFIA VICHETTI SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '11f834cc02ec87e6b6663dccae9f8674'),
    ('000115991525', 'TAYLOR DA SILVA FELIPE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'a3dcd4bd07381c91c9490cbb1df42b1d'),
    ('000120581304', 'THAILANE DOS SANTOS CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '43957e2da6d9d163b5ef289403c4192c'),
    ('000112297851', 'VÍCTOR HUGO SILVA OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'fc1a50f0f9775b12cac9618c0b44d70b'),
    ('000115863035', 'VÍTOR MIGUEL BRITO DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '29f3901ae6c29e841e87cbf965e5bf8e'),
    ('000112510473', 'YURI GABRIEL MELO ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'ab332b354b3d251b15e81492cce7ffe4'),
    ('000112511383', 'EMANUELLY EDUARDA SILVA DOS REIS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '01dccb3779f1c828f4897a9748d60366'),
    ('000115982800', 'MIGUEL CARDOSO MOREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), 'd6c8af0d28e82c52aaee4b4beb64c4bf'),
    ('000120280856', 'LORENA BEATRIZ MELO CRUZ', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '8A'), '8ec7602c6bb192eb9bc8c6598024f30b'),
    ('000115102870', 'ANA BEATRIZ FERREIRA ALMEIDA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'be79087f17b54c9b884c5aa1d2e1fb7f'),
    ('000114284297', 'BEATRIZ VITÓRIA SANTOS SANNER', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '935ed546286a40b69b91c93fd0d88a7e'),
    ('000125453416', 'BRAIAN HENRIQUE DE OLIVEIRA CABRAL', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '15379119d70e4da3b875121e3e17aebc'),
    ('000115193700', 'CAIO RODRIGUES DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'b5d0f23031104d3bb28dc8f04a30489b'),
    ('000114317988', 'EVELYN PAULISTA BORGES DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '17bd85a5b70445beb475af2c81913884'),
    ('000115334217', 'GABRIEL KEYVISON DE SOUZA GONÇALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '0a8bf71c7f1e408a8315917a2f223c99'),
    ('000115185649', 'GABRIEL RODRIGUES LOPES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'cfe314fd38094335a47c879c2c48b853'),
    ('000115370319', 'GUILHERME HENRIQUE DE OLIVEIRA ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '4378b0fdbda74faf87533324f7eaf152'),
    ('000115434846', 'INGRID STÉFANY DE ARAUJO FERREIRA GERMANO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '121d85cf9a1d452e94084105687bd78d'),
    ('000115184218', 'JOÃO GABRIEL MENDES LIMA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '9eba058356464ae89fabdfe13d9aadc5'),
    ('000112512458', 'JOÃO PEDRO LUIS MACHADO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '23e5273131bd46a1bb96dca6c20ac4ba'),
    ('000114499283', 'JONATHAN SAMUEL PATRICIO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '51c2114e308f4e8aa451c87fd65d0e27'),
    ('000115196483', 'LOREN LÉIA MESSIAS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '6e1374670a3f4ef4a1292c979b332ff9'),
    ('000115185677', 'LUARA VITÓRIA FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'b531bd7bffa24946b4a691a878bf6fc3'),
    ('000114983550', 'LUÍSA ANDREAH NEVES DOMINGUES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '716a55d442154481bca4291e72edbf11'),
    ('000115197008', 'MAÍSA MARQUES DA SILVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '42b947684a6a42f79ecb44f3def24a68'),
    ('000113135953', 'MARIA JÚLIA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '02b10d9b137240a3a4149c9a30fcf412'),
    ('000114574999', 'MIGUEL FELIPE CARVALHO BRANDÃO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '96b7a78dbe534415a9064f4949c1822b'),
    ('000115306608', 'MIKAELY GONCALVES FERNANDES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'deba2cef335b42ef81e3fb03442e2ad3'),
    ('000114752508', 'RAFAEL EDUARDO DE SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '6d7fe7d40b424349bb75c20f86309919'),
    ('000115306678', 'RAFAEL HENRIQUE ALMEIDA PORTO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '11e41d09cb9443dcbec90a8475f8b142'),
    ('000112749920', 'RENAN WENDER OLIVEIRA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'a04868abb85a44618eae246260c28c5a'),
    ('000113190216', 'SURYA RAFAELA MELO ALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '7dc6391a0dfb4b25b93b9e9499fcfb9c'),
    ('000113136183', 'VÍCTOR HUGO XAVIER', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '7204ce9e11794b0b9618eb002a581554'),
    ('000115182408', 'VITÓRIA RODRIGUES ALVES DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '0c99b19998674b0497c2c0b9213d7466'),
    ('000115101413', 'JOÃO VYCTOR SANTANA DUARTE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '802ff9685e8c49aa944d6632b9175a8c'),
    ('000113774953', 'BRYAN HENRIQUE MONTEIRO GURGEL', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'c37d2308f1624f299e22571f6453acbc'),
    ('000115210988', 'MELISSA STEFANY DE FARIAS GONÇALVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), 'd305799809904e37868c6220fb2d2cd9'),
    ('000115187366', 'MIGUEL EDUARDO BIZZI DORIGON', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '62b6d74a10f74afba756f6deac5bb619'),
    ('000114186576', 'GABRIELLY VITORIA MONTEIRO BORGES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '9edc9e2c6e7a4256983518d40706c856'),
    ('000113791246', 'YAGO DE SOUZA RAMALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9A'), '9356c109fb974f3da611a3f4d00921e3'),
    ('000114237769', 'ADRYAN AUGUSTO CARVALHO NEVES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '5f9b4d32bc0844c3b3eb7572f24a0b9f'),
    ('000115193960', 'ANA LUISA DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '39c151dee3744312a76d0f377447346b'),
    ('000112858500', 'ANTONIO HENRIQUE GUILHERME DOS SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '70219a659f82481c90b7246a60a9e522'),
    ('000116373230', 'BRYAN NUNES GUIMARÃES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '2dee39a346074d48b81b13069f8e8554'),
    ('000116751668', 'CAUÊ FRANCISCO DOS SANTOS DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '456b866e0ff94481b84918e1ea5e29a8'),
    ('000112397288', 'DÉRIC LUÍS VIANA SAQUETO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '91edec4e5c564f87bab096cdbd34ba9f'),
    ('000115194277', 'ÉLCIO DOMINGOS CANDIDO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '8b28ad3049e64d089c47748f7a50ec34'),
    ('000113001928', 'HELOÍSY CRISTINA OLIVEIRA DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '5dccd1449ffd4217b14a8b88e97c4fab'),
    ('000126207637', 'JUNIOR ALEJANDRO GONZALEZ ACEVEDO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '2ab8757d7bf04f5988dd49e5ea9ab04f'),
    ('000115182112', 'KAUÊ SILVA SANTOS', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '94bcf8cd11154902aca79b3f8dc3ee9f'),
    ('000113945622', 'KETLEN VITORIA CARVALHO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '134756778dba474285057658caeb8e0b'),
    ('000115187288', 'KETLYN DA SILVA CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '4454ba2436c04c3f873bc28c81f019c4'),
    ('000115185768', 'MARIA CAROLINA RODRIGUES CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'c672755e9e2147f8bc16e60747d3d013'),
    ('000115306114', 'MARIA FERNANDA DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '36dbe8c60bd843babbef098553b17bb4'),
    ('000115185461', 'MARIA GABRIELA OLIVEIRA PRADO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '0cc76fd351c2459d9e8582c3f71ab33f'),
    ('000114086325', 'MURILO PEREIRA DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'f999cdab104642b5ad51e3884a76ecfe'),
    ('000115154232', 'PIETRO AUGUSTO FERREIRA AGUIAR', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'eb8653b99e784658bdb0765670cacc9d'),
    ('000115191218', 'RAFAEL HENRIQUE MARQUES ROSÁRIO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '156319037a2b44faa26489f3dcc5804f'),
    ('000115306708', 'SAMUEL DOS SANTOS FERREIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '509b46a7fba24f07ba1d1b590087d57d'),
    ('000115398906', 'THAMARA CRISTINA RODRIGUES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'a48b6c8a488b4819b437477409939cc9'),
    ('000115185934', 'VÍCTOR FERNANDES CAETANO CARNEIRO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '421262b5307a4d318732cf702fdfd9cf'),
    ('000114238025', 'WELITON HENRIQUE FERREIRA GERMANO DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '41f2533658f34a78bd1bdd1cbd590cbc'),
    ('000112815854', 'ISADORA OLIVEIRA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'bc02e7994b7e4113bd207d8dbde01733'),
    ('000111573493', 'MARIA CLARA SOSA CARVALHO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '37fefddcfc71473ba2b7b961e961e92c'),
    ('000113704435', 'RAFAELLA DE PAULA DIAS DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '4ea65ff63cdf4841a86b74e3a0b2ec16'),
    ('000115185799', 'NICOLLY GABRIELLY CANCIO ROCHA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'a47141fdd95f402db15e66c8125c5ccb'),
    ('000114258196', 'BIANCA FERNANDES DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '1d378fb4a3654776a0283397a105c091'),
    ('000113790598', 'LUIS ANTONIO MARTINI JUSTINO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '1ed14d3b0a2b4269906a56d884d8f7eb'),
    ('000113765075', 'ADSON GABRIEL DE PAIVA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'e02b06684bcd40378b51ba36cf69ae14'),
    ('000115184287', 'EMANUELLY MEIRA DE OLIVEIRA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '6c75deb566414d4b97935955add03981'),
    ('000113250154', 'LEONARDO ALVES DA SILVA MORETTE', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'c270da84eb6c47219659eba359830c84'),
    ('000115186942', 'ARTHUR EUGENIO DA SILVA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'a6abfc51b41a4d9ba05685b7745ade61'),
    ('000115312579', 'ANDREZA SILVA LIMA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'cf47b3b87ae347abbe1e3f4ea8a484fd'),
    ('000113341770', 'MARIA JÚLIA CARDOZO DE OLIVEIRA FELICIO', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), '0b23a3a2e58e4aa294dbe6683e81996c'),
    ('000115992916', 'IAGO GABRIEL PEREIRA BORGES', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'b29052dd285641bfa3385021115a5c32'),
    ('000114175310', 'CARLOS ALBERTO NASCIMENTO SOUZA', NULL, NULL, (SELECT id_turma FROM turma WHERE nome_turma = '9B'), 'eac9bbbe8a7649ef97f2a5f450974a9f');

-- Cada aluno possui uma conta (ALUNO 1:1 CONTA).
INSERT INTO conta (status, saldo, ra)
SELECT TRUE, 0.00, ra
FROM aluno;

-- Critérios iniciais do MVP definidos na especificação.
INSERT INTO criterio (nome_criterio, descricao, ativo)
VALUES
    ('Frequência', 'Movimentação gerada a partir do critério de frequência.', TRUE),
    ('Tarefa da Sala do Futuro', 'Movimentação gerada pela realização de tarefa da Sala do Futuro.', TRUE);

-- Movimentações de teste para validar saldo e extrato.
INSERT INTO movimentacao
    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
SELECT
    10.00,
    'ENTRADA',
    '2026-09-03 08:30:00',
    'Entrada por frequência',
    c.id_conta,
    cr.id_criterio
FROM conta AS c
JOIN criterio AS cr
    ON cr.nome_criterio = 'Frequência'
WHERE c.ra = '000120887748';

INSERT INTO movimentacao
    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
SELECT
    20.00,
    'ENTRADA',
    '2026-09-03 09:00:00',
    'Entrada por tarefa da Sala do Futuro',
    c.id_conta,
    cr.id_criterio
FROM conta AS c
JOIN criterio AS cr
    ON cr.nome_criterio = 'Tarefa da Sala do Futuro'
WHERE c.ra = '000120887748';

INSERT INTO movimentacao
    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
SELECT
    10.00,
    'ENTRADA',
    '2026-09-03 08:45:00',
    'Entrada por frequência',
    c.id_conta,
    cr.id_criterio
FROM conta AS c
JOIN criterio AS cr
    ON cr.nome_criterio = 'Frequência'
WHERE c.ra = '000115937766';

INSERT INTO movimentacao
    (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
SELECT
    20.00,
    'ENTRADA',
    '2026-09-03 09:15:00',
    'Entrada por tarefa da Sala do Futuro',
    c.id_conta,
    cr.id_criterio
FROM conta AS c
JOIN criterio AS cr
    ON cr.nome_criterio = 'Tarefa da Sala do Futuro'
WHERE c.ra = '000120863771';

-- Sincroniza o campo saldo com as movimentações registradas no seed.
UPDATE conta AS c
SET c.saldo = (
    SELECT COALESCE(
        SUM(
            CASE
                WHEN m.tipo = 'ENTRADA' THEN m.valor
                ELSE -m.valor
            END
        ),
        0.00
    )
    FROM movimentacao AS m
    WHERE m.id_conta = c.id_conta
);

COMMIT;
