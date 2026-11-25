using System.Collections.Generic;
using UnityEngine;

public class AparenciaPersonagem : MonoBehaviour
{
    public enum EstiloCabelo { Careca, Curto, Topete, Longo, Coque }
    public enum TipoCamisa { Curta, Regata, Longa }
    public enum TipoCalca { Longa, Bermuda }

    [Header("Geral")]
    public bool aparenciaAleatoria = true;
    public bool esconderCorpoAntigo = true;
    public float alturaDoPe = -1f;
    public float tamanho = 1f;
    public bool animarCaminhada = true;

    [Header("Personalização manual (só vale com 'Aparencia Aleatoria' DESMARCADA)")]
    public Color corPele = new Color(0.88f, 0.67f, 0.41f);
    public Color corCabelo = new Color(0.15f, 0.10f, 0.07f);
    public Color corCamisa = new Color(0.20f, 0.60f, 0.86f);
    public Color corCalca = new Color(0.17f, 0.24f, 0.31f);
    public Color corSapato = Color.white;
    public EstiloCabelo estiloCabelo = EstiloCabelo.Curto;
    public TipoCamisa tipoCamisa = TipoCamisa.Curta;
    public TipoCalca tipoCalca = TipoCalca.Longa;
    public bool usarBone = false;
    public Color corBone = new Color(0.9f, 0.2f, 0.2f);
    public bool usarOculos = false;
    public bool usarMochila = false;
    public Color corMochila = new Color(0.90f, 0.50f, 0.13f);

    [Header("Sorteio dos NPCs")]
    [Range(0f, 1f)] public float chanceBone = 0.2f;
    [Range(0f, 1f)] public float chanceOculos = 0.2f;
    [Range(0f, 1f)] public float chanceMochila = 0.25f;

    private static Color Hex(string h) { Color c; ColorUtility.TryParseHtmlString(h, out c); return c; }
    private static readonly Color[] peles = { Hex("#FFDBAC"), Hex("#F1C27D"), Hex("#E0AC69"), Hex("#C68642"), Hex("#8D5524"), Hex("#6B4226"), Hex("#4A2F1E") };
    private static readonly Color[] cabelos = { Hex("#1B1B1B"), Hex("#3B2A1A"), Hex("#6B4423"), Hex("#A0522D"), Hex("#D9B35B"), Hex("#8E2B1F"), Hex("#9E9E9E") };
    private static readonly Color[] camisas = { Hex("#E74C3C"), Hex("#3498DB"), Hex("#2ECC71"), Hex("#F1C40F"), Hex("#9B59B6"), Hex("#FF7F50"), Hex("#1ABC9C"), Hex("#ECF0F1"), Hex("#34495E"), Hex("#FF69B4"), Hex("#F39C12") };
    private static readonly Color[] calcas = { Hex("#2C3E50"), Hex("#1F2A44"), Hex("#4B5563"), Hex("#6B4F3A"), Hex("#111827"), Hex("#8E9AAF"), Hex("#355C7D") };
    private static readonly Color[] sapatos = { Hex("#FFFFFF"), Hex("#111111"), Hex("#8B4513"), Hex("#C0392B"), Hex("#2D3436") };
    private static readonly Color[] mochilas = { Hex("#E67E22"), Hex("#2980B9"), Hex("#27AE60"), Hex("#8E44AD"), Hex("#2C3E50") };

    private Transform raizVisual, corpoPivo, cabecaPivo, torso;
    private Transform pivoPernaE, pivoPernaD, joelhoE, joelhoD;
    private Transform pivoBracoE, pivoBracoD, cotoveloE, cotoveloD;
    private Vector3 torsoEscalaOriginal = Vector3.one;
    private Vector3 posBaseRaiz;
    private Vector3 ultimaPosicao;
    private float velocidadeSuave, faseAndar, deslocFase;
    private System.Random rng;
    private static int contadorDeInstancias;

    private MovimentoJogador movJogador;
    private bool poseSentadoExterna;
    private float pedalVelExterna;
    private float anguloGuidaoExterno;

    private static Shader shaderBase;
    private static readonly Dictionary<int, Material> cacheMateriais = new Dictionary<int, Material>();

    public void DefinirPosePilotagem(bool sentado, float velocidadePedal, float anguloGuidao)
    {
        poseSentadoExterna = sentado;
        pedalVelExterna = velocidadePedal;
        anguloGuidaoExterno = anguloGuidao;
    }

    public void DefinirVisibilidade(bool visivel)
    {
        if (raizVisual != null)
            raizVisual.gameObject.SetActive(visivel);
    }

    private void Start()
    {
        movJogador = GetComponent<MovimentoJogador>();
        GerarAparencia();
    }

    [ContextMenu("Gerar / Atualizar Aparência")]
    public void GerarAparencia()
    {
        if (GetComponentInChildren<SkinnedMeshRenderer>(true) != null) return;

        DescobrirShader();

        Transform antigo = transform.Find("Visual_Aparencia");
        if (antigo != null) Apagar(antigo.gameObject);

        if (esconderCorpoAntigo)
        {
            foreach (MeshRenderer mr in GetComponentsInChildren<MeshRenderer>(true))
                mr.enabled = false;
        }

        contadorDeInstancias++;
        rng = new System.Random(System.Environment.TickCount + contadorDeInstancias * 7919);
        deslocFase = (float)rng.NextDouble() * 6.28f;

        Color pele, cabelo, camisa, calca, sapato, bone, mochilaCor;
        EstiloCabelo estilo; TipoCamisa tCamisa; TipoCalca tCalca;
        bool temBone, temOculos, temMochila;
        float altura, largura;

        if (aparenciaAleatoria)
        {
            pele = Sortear(peles); cabelo = Sortear(cabelos); camisa = Sortear(camisas);
            calca = Sortear(calcas); sapato = Sortear(sapatos);
            bone = Sortear(camisas); mochilaCor = Sortear(mochilas);
            estilo = (EstiloCabelo)rng.Next(System.Enum.GetValues(typeof(EstiloCabelo)).Length);
            double r = rng.NextDouble();
            tCamisa = r < 0.70 ? TipoCamisa.Curta : (r < 0.85 ? TipoCamisa.Regata : TipoCamisa.Longa);
            tCalca = rng.NextDouble() < 0.70 ? TipoCalca.Longa : TipoCalca.Bermuda;
            temBone = rng.NextDouble() < chanceBone;
            temOculos = rng.NextDouble() < chanceOculos;
            temMochila = rng.NextDouble() < chanceMochila;
            altura = Variar(0.94f, 1.06f);
            largura = Variar(0.92f, 1.08f);
        }
        else
        {
            pele = corPele; cabelo = corCabelo; camisa = corCamisa; calca = corCalca; sapato = corSapato;
            bone = corBone; mochilaCor = corMochila;
            estilo = estiloCabelo; tCamisa = tipoCamisa; tCalca = tipoCalca;
            temBone = usarBone; temOculos = usarOculos; temMochila = usarMochila;
            altura = tamanho; largura = tamanho;
        }

        GameObject raizGO = new GameObject("Visual_Aparencia");
        raizVisual = raizGO.transform;
        raizVisual.SetParent(transform, false);

        Vector3 ls = transform.lossyScale;
        float sx = Mathf.Abs(ls.x) > 0.0001f ? 1f / ls.x : 1f;
        float sy = Mathf.Abs(ls.y) > 0.0001f ? 1f / ls.y : 1f;
        float sz = Mathf.Abs(ls.z) > 0.0001f ? 1f / ls.z : 1f;
        posBaseRaiz = new Vector3(0f, alturaDoPe * sy, 0f);
        raizVisual.localPosition = posBaseRaiz;
        raizVisual.localRotation = Quaternion.identity;
        raizVisual.localScale = new Vector3(sx * largura, sy * altura, sz * largura);

        corpoPivo = CriarPivo("Corpo_Pivo", raizVisual, Vector3.zero);
        Transform r0 = corpoPivo;

        CriarPeca(PrimitiveType.Cube, "Pelve", r0, new Vector3(0, 0.93f, 0), new Vector3(0.34f, 0.16f, 0.21f), calca);
        pivoPernaE = CriarPernaArticulada("PernaE", -0.095f, calca, pele, sapato, tCalca == TipoCalca.Bermuda, out joelhoE);
        pivoPernaD = CriarPernaArticulada("PernaD", 0.095f, calca, pele, sapato, tCalca == TipoCalca.Bermuda, out joelhoD);

        torso = CriarPeca(PrimitiveType.Capsule, "Torso", r0, new Vector3(0, 1.22f, 0), new Vector3(0.40f, 0.30f, 0.25f), camisa);
        torsoEscalaOriginal = torso.localScale;
        CriarPeca(PrimitiveType.Cylinder, "Pescoco", r0, new Vector3(0, 1.55f, 0), new Vector3(0.10f, 0.05f, 0.10f), pele);

        pivoBracoE = CriarBracoArticulado("BracoE", -0.255f, camisa, pele, tCamisa, out cotoveloE);
        pivoBracoD = CriarBracoArticulado("BracoD", 0.255f, camisa, pele, tCamisa, out cotoveloD);

        cabecaPivo = CriarPivo("Cabeca", r0, new Vector3(0, 1.67f, 0));
        CriarPeca(PrimitiveType.Sphere, "Cranio", cabecaPivo, Vector3.zero, new Vector3(0.24f, 0.27f, 0.25f), pele);
        Color escuro = new Color(0.07f, 0.07f, 0.07f);
        CriarPeca(PrimitiveType.Sphere, "OlhoE", cabecaPivo, new Vector3(-0.045f, 0.02f, 0.108f), Vector3.one * 0.032f, escuro);
        CriarPeca(PrimitiveType.Sphere, "OlhoD", cabecaPivo, new Vector3(0.045f, 0.02f, 0.108f), Vector3.one * 0.032f, escuro);
        CriarPeca(PrimitiveType.Cube, "Boca", cabecaPivo, new Vector3(0, -0.055f, 0.112f), new Vector3(0.045f, 0.01f, 0.01f), new Color(0.6f, 0.2f, 0.2f));

        if (estilo != EstiloCabelo.Careca)
        {
            if (!temBone)
                CriarPeca(PrimitiveType.Sphere, "CabeloTopo", cabecaPivo, new Vector3(0, 0.075f, -0.012f), new Vector3(0.255f, 0.19f, 0.265f), cabelo);
            if (estilo == EstiloCabelo.Topete && !temBone)
                CriarPeca(PrimitiveType.Sphere, "Topete", cabecaPivo, new Vector3(0, 0.14f, 0.04f), new Vector3(0.16f, 0.09f, 0.16f), cabelo);
            if (estilo == EstiloCabelo.Coque && !temBone)
                CriarPeca(PrimitiveType.Sphere, "Coque", cabecaPivo, new Vector3(0, 0.17f, -0.09f), Vector3.one * 0.11f, cabelo);
            if (estilo == EstiloCabelo.Longo)
                CriarPeca(PrimitiveType.Capsule, "CabeloLongo", cabecaPivo, new Vector3(0, -0.08f, -0.09f), new Vector3(0.22f, 0.13f, 0.10f), cabelo);
        }

        if (temBone)
        {
            CriarPeca(PrimitiveType.Sphere, "BoneCopa", cabecaPivo, new Vector3(0, 0.075f, -0.005f), new Vector3(0.265f, 0.17f, 0.275f), bone);
            CriarPeca(PrimitiveType.Cube, "BoneAba", cabecaPivo, new Vector3(0, 0.055f, 0.16f), new Vector3(0.20f, 0.015f, 0.13f), bone);
        }
        if (temOculos)
        {
            Color lente = new Color(0.06f, 0.06f, 0.06f);
            CriarPeca(PrimitiveType.Sphere, "OculosE", cabecaPivo, new Vector3(-0.05f, 0.025f, 0.117f), new Vector3(0.06f, 0.048f, 0.02f), lente);
            CriarPeca(PrimitiveType.Sphere, "OculosD", cabecaPivo, new Vector3(0.05f, 0.025f, 0.117f), new Vector3(0.06f, 0.048f, 0.02f), lente);
            CriarPeca(PrimitiveType.Cube, "OculosPonte", cabecaPivo, new Vector3(0, 0.03f, 0.118f), new Vector3(0.03f, 0.01f, 0.01f), lente);
        }
        if (temMochila)
            CriarPeca(PrimitiveType.Cube, "Mochila", r0, new Vector3(0, 1.25f, -0.20f), new Vector3(0.30f, 0.38f, 0.14f), mochilaCor);

        ultimaPosicao = transform.position;
    }

    private void Update()
    {
        if (!animarCaminhada || raizVisual == null || !raizVisual.gameObject.activeInHierarchy) return;

        float dt = Time.deltaTime;
        if (dt <= 0f) return;

        float vel;
        bool correndo = false, agachado = false, nadando = false, noAr = false;
        float timerSoco = 0f, timerAceno = 0f;

        if (movJogador != null && !movJogador.EmVeiculo)
        {
            vel = movJogador.VelocidadeHorizontalAtual;
            correndo = movJogador.EstaCorrendo;
            agachado = movJogador.EstaAgachado;
            nadando = movJogador.EstaNadando;
            noAr = !movJogador.EstaNoChao && !nadando;
            timerSoco = movJogador.TimerSoco;
            timerAceno = movJogador.TimerAceno;
        }
        else
        {
            Vector3 delta = transform.position - ultimaPosicao;
            delta.y = 0f;
            vel = Mathf.Min(delta.magnitude / dt, 10f);
        }
        ultimaPosicao = transform.position;
        velocidadeSuave = Mathf.Lerp(velocidadeSuave, vel, 12f * dt);

        float tLerp = 1f - Mathf.Exp(-14f * dt);

        // Pose especial: Pilotando Moto ou Bicicleta
        if (poseSentadoExterna)
        {
            faseAndar += pedalVelExterna * 2.5f * dt;
            float ped = Mathf.Sin(faseAndar) * 28f * Mathf.Clamp01(pedalVelExterna);
            corpoPivo.localPosition = Vector3.Lerp(corpoPivo.localPosition, new Vector3(0f, -0.38f, -0.05f), tLerp);
            corpoPivo.localRotation = Quaternion.Slerp(corpoPivo.localRotation, Quaternion.Euler(14f, 0f, 0f), tLerp);

            pivoPernaE.localRotation = Quaternion.Slerp(pivoPernaE.localRotation, Quaternion.Euler(-55f + ped, -14f, 0f), tLerp);
            pivoPernaD.localRotation = Quaternion.Slerp(pivoPernaD.localRotation, Quaternion.Euler(-55f - ped, 14f, 0f), tLerp);
            joelhoE.localRotation = Quaternion.Slerp(joelhoE.localRotation, Quaternion.Euler(65f - ped * 0.6f, 0f, 0f), tLerp);
            joelhoD.localRotation = Quaternion.Slerp(joelhoD.localRotation, Quaternion.Euler(65f + ped * 0.6f, 0f, 0f), tLerp);

            pivoBracoE.localRotation = Quaternion.Slerp(pivoBracoE.localRotation, Quaternion.Euler(-58f, anguloGuidaoExterno * 0.4f, -8f), tLerp);
            pivoBracoD.localRotation = Quaternion.Slerp(pivoBracoD.localRotation, Quaternion.Euler(-58f, anguloGuidaoExterno * 0.4f, 8f), tLerp);
            cotoveloE.localRotation = Quaternion.Slerp(cotoveloE.localRotation, Quaternion.Euler(-22f, 0f, 0f), tLerp);
            cotoveloD.localRotation = Quaternion.Slerp(cotoveloD.localRotation, Quaternion.Euler(-22f, 0f, 0f), tLerp);
            cabecaPivo.localRotation = Quaternion.Slerp(cabecaPivo.localRotation, Quaternion.Euler(-10f, anguloGuidaoExterno * 0.5f, 0f), tLerp);
            return;
        }

        // Pose Nado
        if (nadando)
        {
            faseAndar += (2.5f + velocidadeSuave * 1.8f) * dt;
            corpoPivo.localPosition = Vector3.Lerp(corpoPivo.localPosition, new Vector3(0f, 0.35f, 0f), tLerp);
            corpoPivo.localRotation = Quaternion.Slerp(corpoPivo.localRotation, Quaternion.Euler(68f, 0f, Mathf.Sin(faseAndar * 0.5f) * 8f), tLerp);

            float kick = Mathf.Sin(faseAndar * 1.4f) * 24f;
            pivoPernaE.localRotation = Quaternion.Slerp(pivoPernaE.localRotation, Quaternion.Euler(kick, 0f, 0f), tLerp);
            pivoPernaD.localRotation = Quaternion.Slerp(pivoPernaD.localRotation, Quaternion.Euler(-kick, 0f, 0f), tLerp);
            joelhoE.localRotation = Quaternion.Slerp(joelhoE.localRotation, Quaternion.Euler(18f, 0f, 0f), tLerp);
            joelhoD.localRotation = Quaternion.Slerp(joelhoD.localRotation, Quaternion.Euler(18f, 0f, 0f), tLerp);

            pivoBracoE.localRotation = Quaternion.Slerp(pivoBracoE.localRotation, Quaternion.Euler(-90f + Mathf.Sin(faseAndar) * 55f, 0f, -18f), tLerp);
            pivoBracoD.localRotation = Quaternion.Slerp(pivoBracoD.localRotation, Quaternion.Euler(-90f - Mathf.Sin(faseAndar) * 55f, 0f, 18f), tLerp);
            cotoveloE.localRotation = Quaternion.Slerp(cotoveloE.localRotation, Quaternion.Euler(-25f, 0f, 0f), tLerp);
            cotoveloD.localRotation = Quaternion.Slerp(cotoveloD.localRotation, Quaternion.Euler(-25f, 0f, 0f), tLerp);
            cabecaPivo.localRotation = Quaternion.Slerp(cabecaPivo.localRotation, Quaternion.Euler(-52f, 0f, 0f), tLerp);
            return;
        }

        float intensidade = Mathf.Clamp01(velocidadeSuave / 1.4f);
        float fatorCorrida = correndo ? Mathf.Clamp01((velocidadeSuave - 4.5f) / 3.5f) : 0f;
        faseAndar += dt * (2.5f + velocidadeSuave * (correndo ? 1.85f : 1.65f));

        float ampPerna = Mathf.Lerp(32f, 58f, fatorCorrida) * intensidade;
        float angSeno = Mathf.Sin(faseAndar);
        float pE = angSeno * ampPerna;
        float pD = -angSeno * ampPerna;
        float jE = Mathf.Max(0f, -angSeno) * Mathf.Lerp(26f, 62f, fatorCorrida) * intensidade;
        float jD = Mathf.Max(0f, angSeno) * Mathf.Lerp(26f, 62f, fatorCorrida) * intensidade;

        float bE = -angSeno * Mathf.Lerp(28f, 55f, fatorCorrida) * intensidade;
        float bD = angSeno * Mathf.Lerp(28f, 55f, fatorCorrida) * intensidade;
        float cE = Mathf.Lerp(-12f, -68f, fatorCorrida);
        float cD = Mathf.Lerp(-12f, -68f, fatorCorrida);

        Vector3 corpoPosAlvo = new Vector3(0f, Mathf.Abs(angSeno) * (correndo ? 0.07f : 0.03f) * intensidade, 0f);
        Vector3 corpoRotAlvo = new Vector3(fatorCorrida * 15f, 0f, Mathf.Sin(faseAndar) * 2.2f * intensidade);

        // Pose Agachado
        if (agachado)
        {
            corpoPosAlvo.y -= 0.34f;
            corpoRotAlvo.x += 18f;
            pE = pE * 0.55f - 48f;
            pD = pD * 0.55f - 48f;
            jE = Mathf.Max(jE, 72f);
            jD = Mathf.Max(jD, 72f);
        }

        // Pose Pulo / Queda no Ar
        if (noAr)
        {
            pE = -32f; pD = 18f;
            jE = 58f; jD = 22f;
            bE = -38f; bD = -22f;
            cE = -45f; cD = -45f;
            corpoRotAlvo.x = 6f;
        }

        // Soco rápido
        if (timerSoco > 0f)
        {
            float p = Mathf.Sin((timerSoco / 0.42f) * Mathf.PI);
            corpoRotAlvo.y -= 28f * p;
            bD = Mathf.Lerp(bD, -98f, p);
            cD = Mathf.Lerp(cD, -8f, p);
        }
        else if (timerAceno > 0f)
        {
            bD = -145f;
            cD = -20f + Mathf.Sin(Time.time * 12f) * 22f;
        }

        corpoPivo.localPosition = Vector3.Lerp(corpoPivo.localPosition, corpoPosAlvo, tLerp);
        corpoPivo.localRotation = Quaternion.Slerp(corpoPivo.localRotation, Quaternion.Euler(corpoRotAlvo), tLerp);

        pivoPernaE.localRotation = Quaternion.Slerp(pivoPernaE.localRotation, Quaternion.Euler(pE, 0f, 0f), tLerp);
        pivoPernaD.localRotation = Quaternion.Slerp(pivoPernaD.localRotation, Quaternion.Euler(pD, 0f, 0f), tLerp);
        joelhoE.localRotation = Quaternion.Slerp(joelhoE.localRotation, Quaternion.Euler(jE, 0f, 0f), tLerp);
        joelhoD.localRotation = Quaternion.Slerp(joelhoD.localRotation, Quaternion.Euler(jD, 0f, 0f), tLerp);

        pivoBracoE.localRotation = Quaternion.Slerp(pivoBracoE.localRotation, Quaternion.Euler(bE, 0f, -5f), tLerp);
        pivoBracoD.localRotation = Quaternion.Slerp(pivoBracoD.localRotation, Quaternion.Euler(bD, 0f, 5f), tLerp);
        cotoveloE.localRotation = Quaternion.Slerp(cotoveloE.localRotation, Quaternion.Euler(cE, 0f, 0f), tLerp);
        cotoveloD.localRotation = Quaternion.Slerp(cotoveloD.localRotation, Quaternion.Euler(cD, 0f, 0f), tLerp);

        float cabYaw = intensidade < 0.1f ? Mathf.Sin(Time.time * 0.9f + deslocFase) * 14f : 0f;
        float cabPitch = agachado ? -12f : -corpoRotAlvo.x * 0.4f;
        cabecaPivo.localRotation = Quaternion.Slerp(cabecaPivo.localRotation, Quaternion.Euler(cabPitch, cabYaw, 0f), tLerp);

        if (torso != null)
        {
            float resp = 1f + Mathf.Sin(Time.time * (correndo ? 4f : 1.7f) + deslocFase) * 0.015f;
            torso.localScale = new Vector3(torsoEscalaOriginal.x, torsoEscalaOriginal.y * resp, torsoEscalaOriginal.z);
        }
    }

    private Transform CriarPernaArticulada(string nome, float x, Color calca, Color pele, Color sapato, bool bermuda, out Transform joelho)
    {
        Transform pivo = CriarPivo(nome, corpoPivo, new Vector3(x, 0.92f, 0));
        CriarPeca(PrimitiveType.Cylinder, "Coxa", pivo, new Vector3(0, -0.21f, 0), new Vector3(0.16f, 0.215f, 0.16f), calca);
        joelho = CriarPivo("Joelho", pivo, new Vector3(0, -0.42f, 0));
        Color corCanela = bermuda ? pele : calca;
        float largCanela = bermuda ? 0.13f : 0.155f;
        CriarPeca(PrimitiveType.Sphere, "Artic", joelho, Vector3.zero, Vector3.one * 0.15f, corCanela);
        CriarPeca(PrimitiveType.Cylinder, "Canela", joelho, new Vector3(0, -0.21f, 0), new Vector3(largCanela, 0.215f, largCanela), corCanela);
        CriarPeca(PrimitiveType.Cube, "Sapato", joelho, new Vector3(0, -0.46f, 0.04f), new Vector3(0.14f, 0.09f, 0.27f), sapato);
        return pivo;
    }

    private Transform CriarBracoArticulado(string nome, float x, Color camisa, Color pele, TipoCamisa tipo, out Transform cotovelo)
    {
        Transform pivo = CriarPivo(nome, corpoPivo, new Vector3(x, 1.46f, 0));
        Color corSuperior = (tipo == TipoCamisa.Regata) ? pele : camisa;
        Color corAntebraco = (tipo == TipoCamisa.Longa) ? camisa : pele;

        CriarPeca(PrimitiveType.Capsule, "Braco", pivo, new Vector3(0, -0.15f, 0), new Vector3(0.095f, 0.15f, 0.095f), corSuperior);
        cotovelo = CriarPivo("Cotovelo", pivo, new Vector3(0, -0.28f, 0));
        CriarPeca(PrimitiveType.Capsule, "Antebraco", cotovelo, new Vector3(0, -0.13f, 0), new Vector3(0.08f, 0.14f, 0.08f), corAntebraco);
        CriarPeca(PrimitiveType.Sphere, "Mao", cotovelo, new Vector3(0, -0.29f, 0), Vector3.one * 0.085f, pele);
        return pivo;
    }

    private Transform CriarPivo(string nome, Transform pai, Vector3 pos)
    {
        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        return go.transform;
    }

    private Transform CriarPeca(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 escala, Color cor)
    {
        GameObject go = GameObject.CreatePrimitive(tipo);
        go.name = nome;
        Collider col = go.GetComponent<Collider>();
        if (col != null) Apagar(col);
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = escala;
        go.GetComponent<Renderer>().sharedMaterial = PegarMaterial(cor);
        return go.transform;
    }

    private void DescobrirShader()
    {
        if (shaderBase != null) return;
        MeshRenderer mr = GetComponentInChildren<MeshRenderer>(true);
        if (mr != null && mr.sharedMaterial != null) shaderBase = mr.sharedMaterial.shader;
        if (shaderBase == null) shaderBase = Shader.Find("Universal Render Pipeline/Lit");
        if (shaderBase == null) shaderBase = Shader.Find("Standard");
        if (shaderBase == null) shaderBase = Shader.Find("Sprites/Default");
    }

    private static Material PegarMaterial(Color cor)
    {
        Color32 c = cor;
        int chave = (c.r << 24) | (c.g << 16) | (c.b << 8) | c.a;
        if (cacheMateriais.TryGetValue(chave, out Material m) && m != null) return m;

        m = new Material(shaderBase) { hideFlags = HideFlags.HideAndDontSave };
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", cor);
        if (m.HasProperty("_Color")) m.SetColor("_Color", cor);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.15f);
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.15f);
        cacheMateriais[chave] = m;
        return m;
    }

    private Color Sortear(Color[] lista) => lista[rng.Next(lista.Length)];
    private float Variar(float min, float max) => min + (float)rng.NextDouble() * (max - min);
    private static void Apagar(Object o) { if (o == null) return; if (Application.isPlaying) Destroy(o); else DestroyImmediate(o); }
}