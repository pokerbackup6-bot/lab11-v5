-- =============================================================================
-- LAB11 — Seed: Importar usuários existentes para o Supabase Auth
-- =============================================================================
-- PRÉ-REQUISITOS:
--   1. migration_v1.sql já executado
--   2. Extensão pgcrypto habilitada (já incluída no Supabase por padrão)
--
-- ATENÇÃO: Execute este script NO SUPABASE SQL EDITOR com permissão de superuser.
-- Os perfis são criados automaticamente pelo trigger handle_new_user().
--
-- DUPLICATAS REMOVIDAS:
--   carlospaes859@gmail.com  (aparecia 2x → mantido 1)
--   ferreiraluan767@gmail.com (aparecia 2x → mantido 1)
-- =============================================================================

DO $$
DECLARE
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_uid         uuid;

  -- Estrutura de cada usuário: (email, nome, senha_plaintext, is_admin, must_change)
  v_users jsonb := '[
    {"email":"gabrielfmacedo@ymail.com",              "name":"ADMIN LAB11",              "pass":"admin",     "admin":true,  "must_change":false},
    {"email":"pokerbackup6@gmail.com",                "name":"USER ADMIN",               "pass":"admin",     "admin":true,  "must_change":false},
    {"email":"gabrielfpoker@gmail.com",               "name":"GABRIEL POKER",            "pass":"poker",     "admin":false, "must_change":false},
    {"email":"gabrizum@gmail.com",                    "name":"TESTE",                    "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"suporte@grinderstyle.com.br",           "name":"SUPORTE GRINDERSTYLE",     "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"cstreinador@icloud.com",                "name":"CSTREINADOR",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"freitas.hn@hotmail.com",                "name":"FREITAS.HN",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"evaldoddias@yahoo.com.br",              "name":"EVALDODDIAS",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"iamintrepidus@gmail.com",               "name":"IAMINTREPIDUS",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"frotabf@gmail.com",                     "name":"FROTABF",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"iafrate@gmail.com",                     "name":"IAFRATE",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"rrcoutinho@gmail.com",                  "name":"RRCOUTINHO",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"hanio_2@hotmail.com",                   "name":"HANIO_2",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"leo_galante97@hotmail.com",             "name":"LEO_GALANTE97",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"victormoshe@gmail.com",                 "name":"VICTORMOSHE",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"mailsoncx@gmail.com",                   "name":"MAILSONCX",                "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gilbertocgpb22@gmail.com",              "name":"GILBERTOCGPB22",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fmangabeira72@gmail.com",               "name":"FMANGABEIRA72",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"wagnerpedrosalemos@gmail.com",          "name":"WAGNERPEDROSALEMOS",       "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"nunespokerplayer@outlook.com",          "name":"NUNESPOKERPLAYER",         "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"bambinado@gmail.com",                   "name":"BAMBINADO",                "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"pedrocarvalho.sousa95@gmail.com",       "name":"PEDROCARVALHO.SOUSA95",    "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"carlosduardo@hotmail.com",              "name":"CARLOSDUARDO",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"ptobich@uol.com.br",                    "name":"PTOBICH",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"oliveiralucilio29@gmail.com",           "name":"OLIVEIRALUCILIO29",        "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"cadastros.mateusmagalhaes@gmail.com",   "name":"CADASTROS.MATEUSMAGALHAES","pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fasolotiagoedf@gmail.com",              "name":"FASOLOTIAGOEDF",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"danielfar2010@hotmail.com",             "name":"DANIELFAR2010",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"claudiorobertofraga@hotmail.com",       "name":"CLAUDIOROBERTOFRAGA",      "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"ferreiraluan767@gmail.com",             "name":"LUAN FERREIRA",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fabianomac@hotmail.com",                "name":"FABIANOMAC",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"margillabrandao@gmail.com",             "name":"MARGILLABBRANDAO",         "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"eduardoponta@gmail.com",                "name":"EDUARDO PONTA",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"danilo.henriqueg013@gmail.com",         "name":"DANILO HENRIQUE",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"emanuelneto92@gmail.com",               "name":"EMANUEL NETO",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"leom.250396@gmail.com",                 "name":"LEOM",                     "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dagoberto.leocadiojunior@gmail.com",    "name":"DAGOBERTO JR",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"jeanvalentim.jv@gmail.com",             "name":"JEAN VALENTIM",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"marcosmustang87@gmail.com",             "name":"MARCOS MUSTANG",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"baetadann@gmail.com",                   "name":"BAETADANN",                "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"camposmellorafael@gmail.com",           "name":"RAFAEL CAMPOS",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"m.ines.cardoso@sapo.pt",                "name":"M. INES CARDOSO",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"pedroperrini@gmail.com",                "name":"PEDRO PERRINI",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"mvssba@gmail.com",                      "name":"MVSSBA",                   "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"cassiomoradillo@gmail.com",             "name":"CASSIO MORADILLO",         "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"lyrionmatheus@gmail.com",               "name":"LYRION MATHEUS",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"tikovinicius@hotmail.com",              "name":"TIKO VINICIUS",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"renato.bon87@gmail.com",                "name":"RENATO BON",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"tulio_moehlecke@hotmail.com",           "name":"TULIO MOEHLECKE",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"alexsandroalbrecht@gmail.com",          "name":"ALEXSANDRO ALBRECHT",      "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"zequinha@gmail.com",                    "name":"ZEQUINHA",                 "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"phillipfaulhabercrf@gmail.com",         "name":"PHILLIP FAULHABER",        "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"mariah.angie@gmail.com",                "name":"MARIAH ANGIE",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"kristhiano@gmail.com",                  "name":"KRISTHIANO",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"lucas88.ts@gmail.com",                  "name":"LUCAS TS",                 "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fmarciooliveira@gmail.com",             "name":"MARCIO OLIVEIRA",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dracaroliner@gmail.com",                "name":"CAROLINE R",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"nilsonsilva2@hotmail.com",              "name":"NILSON SILVA",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"julioantualpa@gmail.com",               "name":"JULIO ANTUALPA",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"felipecezarsilva13@gmail.com",          "name":"FELIPE CEZAR",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"danillodiaz@outlook.com",               "name":"DANILLO DIAZ",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"guilhermeastorrevieira@gmail.com",      "name":"GUILHERME ASTORRE",        "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gabrielskriva@gmail.com",               "name":"GABRIEL SKRIVA",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"hique2010@gmail.com",                   "name":"HIQUE 2010",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"diogozamagna@sapo.pt",                  "name":"DIOGO ZAMAGNA",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"thiagohagge09@gmail.com",               "name":"THIAGO HAGGE",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"filipesbs@gmail.com",                   "name":"FILIPE SBS",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"isperaluisio@gmail.com",                "name":"ISPERA LUISIO",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"pablovianadias@yahoo.com.br",           "name":"PABLO VIANA",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"d.mendesdasilva11@gmail.com",           "name":"MENDES DA SILVA",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dasilvath02@gmail.com",                 "name":"THIAGO SILVA 02",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"delfinobruno.cps@gmail.com",            "name":"BRUNO DELFINO",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"alexoliveira.lelex1212@gmail.com",      "name":"ALEX OLIVEIRA",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gianichini01@gmail.com",                "name":"GIANICHINI",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"elcio6565@gmail.com",                   "name":"ELCIO",                    "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"evaldoddias@gmail.com",                 "name":"EVALDO DIAS",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"luanadamasceno@id.uff.br",              "name":"LUANA DAMASCENO",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"denismarques268@gmail.com",             "name":"DENIS MARQUES",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"luciojogos2019@gmail.com",              "name":"LUCIO JOGOS",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"brandaobz21@hotmail.com",               "name":"BRANDAOBZ21",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gilmarjunior36@hotmail.com",            "name":"GILMAR JUNIOR",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"drfbfraga@gmail.com",                   "name":"FBFRAGA",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"soldigitalll@gmail.com",                "name":"SOLDIGITALL",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"renato.curty@hotmail.com",              "name":"RENATO CURTY",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"tony.unika@gmail.com",                  "name":"TONY UNIKA",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"munarettoadvogado@gmail.com",           "name":"MUNARETTO ADVOGADO",       "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dricapinotti@gmail.com",                "name":"DRICA PINOTTI",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"bnotorius08@gmail.com",                 "name":"BNOTORIUS08",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"rodshinkado@gmail.com",                 "name":"ROD SHINKADO",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"arlen-s@hotmail.com",                   "name":"ARLEN S",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fabianaueti@gmail.com",                 "name":"FABIANA UETI",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"jeanlucas.g@hotmail.com",               "name":"JEAN LUCAS",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"alves.jj8012554@gmail.com",             "name":"ALVES JJ",                 "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dantedrago@gmail.com",                  "name":"DANTE DRAGO",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"mayconbkl@gmail.com",                   "name":"MAYCON BKL",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"murilomatheusrafaela@gmail.com",        "name":"MURILO MATHEUS",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"miguelpiaya@hotmail.com",               "name":"MIGUEL PIAYA",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"tiagomdrt@gmail.com",                   "name":"TIAGO MDRT",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"renato.siqueira@live.com",              "name":"RENATO SIQUEIRA",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"fernandorafaelteodoro@gmail.com",       "name":"FERNANDO RAFAEL",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"marcosneres9@gmail.com",                "name":"MARCOS NERES",             "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"kiboimportacao@hotmail.com",            "name":"KIBO IMPORTACAO",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"pedroagt10@gmail.com",                  "name":"PEDRO AGT",                "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"nsmascarenhas@gmail.com",               "name":"NS MASCARENHAS",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"elisbar_98@hotmail.com",                "name":"ELISBAR 98",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"felipebarbosa.docs@gmail.com",          "name":"FELIPE BARBOSA",           "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"dasilvath26@gmail.com",                 "name":"THIAGO SILVA 26",          "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gabrieljelenski@gmail.com",             "name":"GABRIEL JELENSKI",         "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"carlospaes859@gmail.com",               "name":"CARLOS PAES",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"vruano84@yahoo.com",                    "name":"VRUANO",                   "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"gabrielmmousinho@gmail.com",            "name":"GABRIEL MOUSINHO",         "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"amos_jp3@yahoo.com",                    "name":"AMOS JP",                  "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"pradomilionario@gmail.com",             "name":"LEVI PRADO",               "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"osvaldo.amaro646@gmail.com",            "name":"OSVALDO AMARO",            "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"luiz.h.milani@hotmail.com",             "name":"LUIZ MILANI",              "pass":"poker2026", "admin":false, "must_change":false},
    {"email":"lucas02.ssouza@gmail.com",              "name":"LUCAS SOUZA",              "pass":"poker2026", "admin":false, "must_change":false}
  ]';

  v_user jsonb;

BEGIN
  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    -- Pular se o email já existe (idempotente — seguro rodar 2x)
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM auth.users WHERE email = lower(v_user->>'email')
    );

    -- Gerar UUID único para o usuário
    v_uid := uuid_generate_v4();

    -- Inserir no auth.users (Supabase Auth)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    )
    VALUES (
      v_instance_id,
      v_uid,
      'authenticated',
      'authenticated',
      lower(v_user->>'email'),
      -- Senha criptografada com bcrypt (custo 10, padrão Supabase)
      crypt(v_user->>'pass', gen_salt('bf', 10)),
      now(),  -- email já confirmado (sem verificação necessária)
      jsonb_build_object(
        'full_name',           v_user->>'name',
        'must_change_password', (v_user->>'must_change')::boolean
      ),
      now(),
      now(),
      '',
      ''
    );

    -- Criar identity (obrigatório para signInWithPassword funcionar)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid,
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', lower(v_user->>'email')),
      'email',
      now(), now(), now()
    );

    -- Atualizar perfil para setar is_admin (o trigger já cria o perfil,
    -- mas não tem acesso ao campo is_admin do JSON — fazemos UPDATE separado)
    UPDATE public.profiles
    SET
      full_name             = v_user->>'name',
      is_admin              = (v_user->>'admin')::boolean,
      must_change_password  = (v_user->>'must_change')::boolean
    WHERE id = v_uid;

  END LOOP;

  RAISE NOTICE 'Seed de usuários concluído com sucesso.';
END;
$$;


-- =============================================================================
-- Verificação: contar usuários criados
-- =============================================================================
SELECT
  COUNT(*) AS total_auth_users
FROM auth.users
WHERE email IN (
  'gabrielfmacedo@ymail.com', 'pokerbackup6@gmail.com', 'gabrielfpoker@gmail.com'
);

SELECT
  p.full_name,
  u.email,
  p.is_admin,
  p.must_change_password
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.is_admin DESC, p.full_name;
