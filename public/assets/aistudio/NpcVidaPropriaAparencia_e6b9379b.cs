using UnityEngine;

// ============================================================
//  NpcVidaPropriaAparencia
//  Segunda metade do NpcVidaPropria: monta o boneco detalhado
//  com variações aleatórias (pele, cabelo, roupa, acessórios...)
//  e anima as pernas. NÃO coloque este script em nenhum objeto:
//  ele é parte do NpcVidaPropria.
// ============================================================
public partial class NpcVidaPropria
{
    // ---------------- CONFIGURAÇÕES ----------------
    [Header("Aparência Detalhada (boneco bonito)")]
    [Tooltip("Marcado = NPC usa o boneco detalhado com variações aleatórias.\nDesmarcado = volta para a cápsula simples.")]
    public bool usarCorpoDetalhado = true;
    [Range(0f, 1f)] [Tooltip("Chance de usar boné.")] public float chanceBone = 0.2f;
    [Range(0f, 1f)] [Tooltip("Chance de usar óculos escuros.")] public float chanceOculos = 0.2f;
    [Range(0f, 1f)] [Tooltip("Chance de usar mochila.")] public float chanceMochila = 0.25f;
    [Range(0f, 1f)] [Tooltip("Chance de usar bermuda.")] public float chanceBermuda = 0.3f;
    [Range(0f, 1f)] [Tooltip("Chance de ter barba.")] public float chanceBarba = 0.15f;
    [Range(0f, 0.2f)] [Tooltip("Variação sorteada de altura (0.06 = 6% para mais ou para menos).")] public float variacaoAltura = 0.06f;
    [Range(0f, 0.2f)] [Tooltip("Variação sorteada de largura do corpo.")] public float variacaoLargura = 0.08f;

    // ---------------- PALETAS ----------------
    private static Color HexDet(string h) { Color c; ColorUtility.TryParseHtmlString(h, out c); return c; }
    private static readonly Color[] peleDet = { HexDet("#FFDBAC"), HexDet("#F1C27D"), HexDet("#E0AC69"), HexDet("#C68642"), HexDet("#8D5524"), HexDet("#6B4226"), HexDet("#4A2F1E") };
    private static readonly Color[] cabeloDet = { HexDet("#1B1B1B"), HexDet("#3B2A1A"), HexDet("#6B4423"), HexDet("#A0522D"), HexDet("#D9B35B"), HexDet("#8E2B1F"), HexDet("#9E9E9E") };
    private static readonly Color[] calcaDet = { HexDet("#2C3E50"), HexDet("#1F2A44"), HexDet("#4B5563"), HexDet("#6B4F3A"), HexDet("#111827"), HexDet("#8E9AAF"), HexDet("#355C7D") };
    private static readonly Color[] sapatoDet = { HexDet("#FFFFFF"), HexDet("#111111"), HexDet("#8B4513"), HexDet("#C0392B"), HexDet("#2D3436") };
    private static readonly Color[] mochilaDet = { HexDet("#E67E22"), HexDet("#2980B9"), HexDet("#27AE60"), HexDet("#8E44AD"), HexDet("#2C3E50") };

    // ---------------- PEÇAS GUARDADAS ----------------
    private Transform raizCorpo, pernaDir, pernaEsq, joelhoDir, joelhoEsq, cotoveloDir, cotoveloEsq;
    private float sentadoFator;

    private static Color SorteioDet(Color[] lista) { return lista[Random.Range(0, lista.Length)]; }
    private static Color Escurecer(Color c, float f) { return new Color(c.r * f, c.g * f, c.b * f); }

    // ============================================================
    //  MONTA O BONECO (chamado pelo ConstruirCorpo)
    // ============================================================
    private void ConstruirCorpoDetalhado()
    {
        // ----- sorteio da aparência -----
        Color pele = SorteioDet(peleDet);
        Color cabelo = SorteioDet(cabeloDet);
        Color camisa = (coresDeRoupa != null && coresDeRoupa.Length > 0)
            ? coresDeRoupa[Random.Range(0, coresDeRoupa.Length)] : Color.gray;
        Color calca = SorteioDet(calcaDet);
        Color sapato = SorteioDet(sapatoDet);
        Color corBone = (coresDeRoupa != null && coresDeRoupa.Length > 0)
            ? coresDeRoupa[Random.Range(0, coresDeRoupa.Length)] : Color.red;
        Color corMochila = SorteioDet(mochilaDet);

        int estilo = Random.Range(0, 5);              // 0 careca, 1 curto, 2 topete, 3 longo, 4 coque
        float r = Random.value;
        int tipoCamisa = r < 0.70f ? 0 : (r < 0.85f ? 1 : 2);   // 0 curta, 1 regata, 2 manga longa
        bool bermuda = Random.value < chanceBermuda;
        bool temBone = Random.value < chanceBone;
        bool temOculos = Random.value < chanceOculos;
        bool temMochila = Random.value < chanceMochila;
        bool temBarba = estilo != 3 && Random.value < chanceBarba;

        float altura = 1f + Random.Range(-variacaoAltura, variacaoAltura);
        float largura = 1f + Random.Range(-variacaoLargura, variacaoLargura);

        // ----- raiz (guarda todas as peças) -----
        raizCorpo = NovoPivo("Corpo", visual, Vector3.zero);
        raizCorpo.localScale = new Vector3(largura, altura, largura);
        Transform r0 = raizCorpo;

        // ----- pelve e pernas -----
        Criar(PrimitiveType.Cube, "Pelve", r0, new Vector3(0f, 0.93f, 0f), new Vector3(0.34f, 0.16f, 0.21f), calca);
        CriarPernaDetalhada("PernaEsq", -0.095f, calca, pele, sapato, bermuda, out pernaEsq, out joelhoEsq);
        CriarPernaDetalhada("PernaDir", 0.095f, calca, pele, sapato, bermuda, out pernaDir, out joelhoDir);

        // ----- torso e pescoço -----
        Criar(PrimitiveType.Capsule, "Torso", r0, new Vector3(0f, 1.22f, 0f), new Vector3(0.40f, 0.30f, 0.25f), camisa);
        Criar(PrimitiveType.Cylinder, "Pescoco", r0, new Vector3(0f, 1.55f, 0f), new Vector3(0.10f, 0.05f, 0.10f), pele);

        // ----- braços (usam os mesmos campos do script principal) -----
        bracoDir = CriarBracoDetalhado("BracoDir", 0.255f, camisa, pele, tipoCamisa, out cotoveloDir);
        bracoEsq = CriarBracoDetalhado("BracoEsq", -0.255f, camisa, pele, tipoCamisa, out cotoveloEsq);

        // ----- cabeça -----
        cabeca = NovoPivo("Cabeca", r0, new Vector3(0f, 1.67f, 0f));
        Transform cab = cabeca;
        Color escuro = new Color(0.07f, 0.07f, 0.07f);
        Criar(PrimitiveType.Sphere, "Cranio", cab, Vector3.zero, new Vector3(0.24f, 0.27f, 0.25f), pele);
        Criar(PrimitiveType.Sphere, "OlhoEsq", cab, new Vector3(-0.045f, 0.02f, 0.108f), Vector3.one * 0.032f, escuro);
        Criar(PrimitiveType.Sphere, "OlhoDir", cab, new Vector3(0.045f, 0.02f, 0.108f), Vector3.one * 0.032f, escuro);
        Color corSobrancelha = estilo == 0 ? Escurecer(pele, 0.4f) : cabelo;
        Criar(PrimitiveType.Cube, "SobrancelhaEsq", cab, new Vector3(-0.045f, 0.058f, 0.104f), new Vector3(0.05f, 0.01f, 0.012f), corSobrancelha);
        Criar(PrimitiveType.Cube, "SobrancelhaDir", cab, new Vector3(0.045f, 0.058f, 0.104f), new Vector3(0.05f, 0.01f, 0.012f), corSobrancelha);
        Criar(PrimitiveType.Cube, "Nariz", cab, new Vector3(0f, -0.012f, 0.123f), new Vector3(0.035f, 0.04f, 0.04f), Escurecer(pele, 0.92f));
        Criar(PrimitiveType.Cube, "Boca", cab, new Vector3(0f, -0.055f, 0.112f), new Vector3(0.045f, 0.01f, 0.01f), new Color(0.6f, 0.2f, 0.2f));
        Criar(PrimitiveType.Sphere, "OrelhaEsq", cab, new Vector3(-0.118f, 0f, 0f), new Vector3(0.04f, 0.06f, 0.045f), pele);
        Criar(PrimitiveType.Sphere, "OrelhaDir", cab, new Vector3(0.118f, 0f, 0f), new Vector3(0.04f, 0.06f, 0.045f), pele);

        // ----- cabelo e barba -----
        if (estilo != 0)
        {
            if (!temBone)
                Criar(PrimitiveType.Sphere, "CabeloTopo", cab, new Vector3(0f, 0.075f, -0.012f), new Vector3(0.255f, 0.19f, 0.265f), cabelo);
            if (estilo == 2 && !temBone)
                Criar(PrimitiveType.Sphere, "Topete", cab, new Vector3(0f, 0.14f, 0.04f), new Vector3(0.16f, 0.09f, 0.16f), cabelo);
            if (estilo == 4 && !temBone)
                Criar(PrimitiveType.Sphere, "Coque", cab, new Vector3(0f, 0.17f, -0.09f), Vector3.one * 0.11f, cabelo);
            if (estilo == 3)
                Criar(PrimitiveType.Capsule, "CabeloLongo", cab, new Vector3(0f, -0.08f, -0.09f), new Vector3(0.22f, 0.13f, 0.10f), cabelo);
        }
        if (temBarba)
            Criar(PrimitiveType.Sphere, "Barba", cab, new Vector3(0f, -0.075f, 0.045f), new Vector3(0.17f, 0.09f, 0.13f), cabelo);

        // ----- acessórios -----
        if (temBone)
        {
            Criar(PrimitiveType.Sphere, "BoneCopa", cab, new Vector3(0f, 0.075f, -0.005f), new Vector3(0.265f, 0.17f, 0.275f), corBone);
            Criar(PrimitiveType.Cube, "BoneAba", cab, new Vector3(0f, 0.055f, 0.16f), new Vector3(0.20f, 0.015f, 0.13f), corBone);
        }
        if (temOculos)
        {
            Color lente = new Color(0.06f, 0.06f, 0.06f);
            Criar(PrimitiveType.Sphere, "OculosEsq", cab, new Vector3(-0.05f, 0.025f, 0.117f), new Vector3(0.06f, 0.048f, 0.02f), lente);
            Criar(PrimitiveType.Sphere, "OculosDir", cab, new Vector3(0.05f, 0.025f, 0.117f), new Vector3(0.06f, 0.048f, 0.02f), lente);
            Criar(PrimitiveType.Cube, "OculosPonte", cab, new Vector3(0f, 0.03f, 0.118f), new Vector3(0.03f, 0.01f, 0.01f), lente);
        }
        if (temMochila)
            Criar(PrimitiveType.Cube, "Mochila", r0, new Vector3(0f, 1.25f, -0.20f), new Vector3(0.30f, 0.38f, 0.14f), corMochila);

        // ----- celular (fica na mão direita, só aparece no estado Celular) -----
        Transform cel = Criar(PrimitiveType.Cube, "Celular", cotoveloDir, new Vector3(0f, -0.29f, 0.06f),
                              new Vector3(0.085f, 0.16f, 0.015f), new Color(0.08f, 0.08f, 0.10f));
        Transform tela = Criar(PrimitiveType.Cube, "Tela", cel, Vector3.zero, Vector3.one, new Color(0.35f, 0.70f, 1f));
        tela.localPosition = new Vector3(0f, 0f, 0.51f);
        tela.localScale = new Vector3(0.85f, 0.875f, 0.1f);
        celularObj = cel.gameObject;
        celularObj.SetActive(false);
    }

    private Transform CriarBracoDetalhado(string nome, float x, Color camisa, Color pele, int tipoCamisa, out Transform cotovelo)
    {
        Transform pivo = NovoPivo(nome, raizCorpo, new Vector3(x, 1.46f, 0f));
        Color cima = tipoCamisa == 1 ? pele : camisa;       // regata: ombro de fora
        Color baixo = tipoCamisa == 2 ? camisa : pele;      // manga longa: antebraço coberto

        Criar(PrimitiveType.Capsule, "Braco", pivo, new Vector3(0f, -0.15f, 0f), new Vector3(0.095f, 0.15f, 0.095f), cima);
        cotovelo = NovoPivo("Cotovelo", pivo, new Vector3(0f, -0.28f, 0f));
        Criar(PrimitiveType.Capsule, "Antebraco", cotovelo, new Vector3(0f, -0.13f, 0f), new Vector3(0.08f, 0.14f, 0.08f), baixo);
        Criar(PrimitiveType.Sphere, "Mao", cotovelo, new Vector3(0f, -0.29f, 0f), Vector3.one * 0.085f, pele);

        cotovelo.localRotation = Quaternion.Euler(-12f, 0f, 0f);
        pivo.localRotation = Quaternion.Euler(0f, 0f, x < 0f ? -5f : 5f);
        return pivo;
    }

    private void CriarPernaDetalhada(string nome, float x, Color calca, Color pele, Color sapato, bool bermuda,
                                     out Transform quadril, out Transform joelho)
    {
        Color corCanela = bermuda ? pele : calca;
        float larguraCanela = bermuda ? 0.13f : 0.155f;

        quadril = NovoPivo(nome, raizCorpo, new Vector3(x, 0.92f, 0f));
        Criar(PrimitiveType.Cylinder, "Coxa", quadril, new Vector3(0f, -0.21f, 0f), new Vector3(0.16f, 0.215f, 0.16f), calca);

        joelho = NovoPivo("Joelho", quadril, new Vector3(0f, -0.42f, 0f));
        Criar(PrimitiveType.Sphere, "Articulacao", joelho, Vector3.zero, Vector3.one * 0.155f, corCanela);
        Criar(PrimitiveType.Cylinder, "Canela", joelho, new Vector3(0f, -0.21f, 0f), new Vector3(larguraCanela, 0.215f, larguraCanela), corCanela);
        Criar(PrimitiveType.Cube, "Sapato", joelho, new Vector3(0f, -0.46f, 0.04f), new Vector3(0.14f, 0.09f, 0.27f), sapato);
    }

    private Transform NovoPivo(string nome, Transform pai, Vector3 pos)
    {
        GameObject g = new GameObject(nome);
        g.transform.SetParent(pai, false);
        g.transform.localPosition = pos;
        return g.transform;
    }

    // ============================================================
    //  ANIMAÇÃO DAS PERNAS, COTOVELOS E POSE SENTADA
    //  (chamado todo frame pelo AtualizarAnimacao)
    // ============================================================
    private void AnimarPartesDetalhadas(float dt)
    {
        if (raizCorpo == null || pernaDir == null || pernaEsq == null) return;

        // Sentado? (o script principal já abaixa o corpo; aqui dobramos as pernas)
        bool sentadoAgora = estado == Estado.Sentado && faseSentar == 1;
        sentadoFator = Mathf.Lerp(sentadoFator, sentadoAgora ? 1f : 0f, 1f - Mathf.Exp(-8f * dt));

        float anda = Mathf.Clamp01(velSuave / 1f);
        float correndo = Mathf.Clamp01((velSuave - 3f) / 2f);
        float amp = Mathf.Lerp(28f, 50f, correndo) * anda;
        float a = Mathf.Sin(faseAndar) * amp;   // positivo = perna esquerda para trás

        float quadrilEsq = Mathf.Lerp(a, -80f, sentadoFator);
        float quadrilDir = Mathf.Lerp(-a, -80f, sentadoFator);
        float joelhoEsqAng = Mathf.Lerp(Mathf.Max(0f, a) * 0.9f, 85f, sentadoFator);
        float joelhoDirAng = Mathf.Lerp(Mathf.Max(0f, -a) * 0.9f, 85f, sentadoFator);

        pernaEsq.localRotation = Quaternion.Euler(quadrilEsq, 0f, 0f);
        pernaDir.localRotation = Quaternion.Euler(quadrilDir, 0f, 0f);
        joelhoEsq.localRotation = Quaternion.Euler(joelhoEsqAng, 0f, 0f);
        joelhoDir.localRotation = Quaternion.Euler(joelhoDirAng, 0f, 0f);

        // Cotovelos dobram conforme o que o NPC está fazendo
        float dobraDir = -12f, dobraEsq = -12f;
        if (estado == Estado.Celular) dobraDir = -70f;
        else if (estado == Estado.Correndo || estado == Estado.Assustado) { dobraDir = -45f; dobraEsq = -45f; }
        else if (estado == Estado.Conversando && faseConversa == 1) dobraDir = -40f;
        else if (acenando) dobraDir = -20f;

        float t = 1f - Mathf.Exp(-10f * dt);
        if (cotoveloDir != null) cotoveloDir.localRotation = Quaternion.Slerp(cotoveloDir.localRotation, Quaternion.Euler(dobraDir, 0f, 0f), t);
        if (cotoveloEsq != null) cotoveloEsq.localRotation = Quaternion.Slerp(cotoveloEsq.localRotation, Quaternion.Euler(dobraEsq, 0f, 0f), t);

        // Inclina o corpo um pouco para a frente ao correr e sobe um tiquinho ao sentar (para o sapato não afundar)
        raizCorpo.localRotation = Quaternion.Slerp(raizCorpo.localRotation, Quaternion.Euler(8f * correndo, 0f, 0f), t);
        Vector3 p = raizCorpo.localPosition;
        p.y = Mathf.Lerp(0f, 0.035f, sentadoFator);
        raizCorpo.localPosition = p;
    }
}