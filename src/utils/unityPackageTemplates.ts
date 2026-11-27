import { VehicleConcept } from '../types/vehicle';

export function generateControleVeiculo50Cs(): string {
  return `using System.Collections.Generic;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public enum TipoFisicaVeiculo50 { Carro, Moto, Barco, Helicoptero, Hovercraft, Aviao }

/// <summary>
/// Controlador estilo GTA com suspensão Raycast por roda, barra estabilizadora,
/// tração progressiva, freio -> ré, drift no freio de mão (Espaço), controle aéreo e IA urbana.
/// Compatível com Unity 6 e versões anteriores.
/// </summary>
[RequireComponent(typeof(Rigidbody))]
public class ControleVeiculo50 : MonoBehaviour
{
    public static readonly List<ControleVeiculo50> Todos = new List<ControleVeiculo50>();

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetarEstaticos()
    {
        Todos.Clear();
        semaforosCache.Clear();
        semaforosCarregados = false;
        mpb = null;
        camMainCache = null;
    }

    [Header("Identificação")]
    public string codigo = "VHC-01";
    public string nomeModelo = "Veículo Conceito";
    public string classeUnity = "Urbanos & Executivos";
    public string rankDesempenho = "Classe B";
    public TipoFisicaVeiculo50 tipoFisica = TipoFisicaVeiculo50.Carro;

    [Header("Desempenho")]
    public float velocidadeMaxKmh = 180f;
    public float aceleracao = 18f;
    public float velocidadeReKmh = 45f;
    public float velocidadeGiro = 115f;
    public float forcaFreio = 38f;
    public float aderenciaLateral = 10.5f;
    public float inclinacaoCurva = 0f;

    [Header("Dimensões e Suspensão (preenchido pela Fábrica)")]
    public float comprimento = 4.4f;
    public float largura = 1.85f;
    public float altura = 1.5f;
    public float distanciaEixos = 2.7f;
    public float raioRoda = 0.34f;
    public float vaoSolo = 0.16f;
    public float zEixoDianteiro = 1.35f;
    public float zEixoTraseiro = -1.35f;
    public bool ehQuadriciclo = false;
    [HideInInspector] public float meioComprimento = 2.2f;
    [HideInInspector] public bool ehVeiculoLongo = false;

    [Header("Tráfego Automático (IA na pista)")]
    public bool modoIA = false;
    public float velocidadeIAKmh = 36f;

    [System.Serializable]
    public class PortaArticulada50
    {
        public Transform pivo;
        public Vector3 rotacaoAbertaEuler;
        public Vector3 deslocamentoAbertoLocal;
        [HideInInspector] public Quaternion rotFechada;
        [HideInInspector] public Vector3 posFechada;
        [HideInInspector] public bool inicializada;
    }

    [Header("Peças Animadas (preenchido pela Fábrica)")]
    public bool ehBicicleta = false;
    public Transform volantePivo;
    public Transform guidaoPivo;
    public Transform pedivelaPivo;
    public List<Transform> pedais = new List<Transform>();
    public List<Transform> rodasDianteiras = new List<Transform>();
    public List<Transform> rodasTraseiras = new List<Transform>();
    public List<Transform> rotores = new List<Transform>();
    public List<Transform> helices = new List<Transform>();
    public List<Transform> chamasJato = new List<Transform>();
    public Transform tamborBetoneira;
    public List<Transform> escovasVarredoura = new List<Transform>();
    public List<PortaArticulada50> portasArticuladas = new List<PortaArticulada50>();
    public bool portasAbertas = false;
    private float aberturaPortasAtual = 0f;

    [Header("Luzes e Giroflex")]
    public List<Renderer> farois = new List<Renderer>();
    public List<Renderer> lanternas = new List<Renderer>();
    public List<Renderer> giroflexVermelho = new List<Renderer>();
    public List<Renderer> giroflexAzul = new List<Renderer>();
    public List<Renderer> giroflexAmbar = new List<Renderer>();
    public bool luzesLigadas = true;

    public float VelocidadeAtualKmh { get; private set; }
    public float AnguloGuidaoAtual { get; private set; }
    public bool MotorLigado { get; set; } = false;
    public bool EstaNoChao { get; private set; }
    public Rigidbody Rb => rb;

    private Rigidbody rb;
    private GeradorCidadeInicial geradorCidade;
    private float tempoPisca;
    private float anguloRodas;
    private float steerSuave;
    private float inputAcel, inputGiro, inputSubir;
    private bool inputFreio, inputTurbo;
    private bool freandoAtivo;

    // Suspensão por roda (4 cantos p/ carros/ATV, 2 inline p/ motos)
    private readonly float[] compRodas = new float[4];
    private readonly bool[] hitRodas = new bool[4];
    private float suspCurso = 0.24f;
    private float suspRepouso = 0.45f;
    private float suspMaxRay = 0.57f;
    private float visualOffsetDianteiro;
    private float visualOffsetTraseiro;
    private readonly List<float> baseYDianteiras = new List<float>();
    private readonly List<float> baseYTraseiras = new List<float>();
    private bool basesRodasSalvas = false;

    // Estado de IA (Grid urbano, Aéreo e Aquático)
    private Vector3 dirAlvoIA = Vector3.forward;
    private float timerSensorIA;
    private float timerPresoIA;
    private Vector3 posCheckIA;
    private float freioIA;

    private bool usaGridIA = false;
    private float[] gridRuasX;
    private float[] gridRuasZ;
    private float gridLaneOff = 2.2f;
    private int idxRuaAtual;
    private bool eixoXAtual = true;
    private int sentidoAtual = 1;
    private int idxCruzAlvo;
    private bool emCurvaCruzamento = false;
    private Vector3 curvaP0, curvaP1, curvaP2;
    private float curvaT;
    private Vector3 alvoPontoIA;

    private bool emVooPatrulhaIA = false;
    private Vector3 centroOrbitaIA;
    private float raioOrbitaIA = 55f;
    private float altitudeAlvoIA = 52f;
    private float anguloOrbitaIA;
    private float velAngularOrbitaIA = 0.22f;

    private bool navegandoRioIA = false;
    private float rioSAtual;
    private int rioSentido = 1;
    private float rioMaxS = 70f;

    private readonly Vector3[] pontosSuspLocal = new Vector3[4];
    private readonly Vector3[] candDirBuf = new Vector3[4];
    private int ultimoEstadoLuzes = -1;
    private float distCamSqCache = 0f;

    private static readonly RaycastHit[] bufSensor = new RaycastHit[16];
    private static readonly RaycastHit[] bufSusp = new RaycastHit[8];
    private static readonly List<CidadeSemaforoControlador> semaforosCache = new List<CidadeSemaforoControlador>();
    private static bool semaforosCarregados = false;
    private static MaterialPropertyBlock mpb;
    private static Camera camMainCache;

    private static Camera PegarCameraPrincipal()
    {
        if (camMainCache == null || !camMainCache.isActiveAndEnabled)
            camMainCache = Camera.main;
        return camMainCache;
    }

    private Vector3 Vel
    {
        get
        {
#if UNITY_6000_0_OR_NEWER
            return rb.linearVelocity;
#else
            return rb.velocity;
#endif
        }
    }

    private void SetVelocity(Vector3 v)
    {
#if UNITY_6000_0_OR_NEWER
        rb.linearVelocity = v;
#else
        rb.velocity = v;
#endif
    }

    private void SetDamping(float lin, float ang)
    {
#if UNITY_6000_0_OR_NEWER
        rb.linearDamping = lin;
        rb.angularDamping = ang;
#else
        rb.drag = lin;
        rb.angularDrag = ang;
#endif
    }

    private void OnEnable()
    {
        if (!Todos.Contains(this)) Todos.Add(this);
    }

    private void OnDisable()
    {
        Todos.Remove(this);
    }

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.interpolation = RigidbodyInterpolation.Interpolate;
        rb.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
        AplicarConfigFisica();
    }

    public void AplicarConfigFisica()
    {
        if (rb == null) rb = GetComponent<Rigidbody>();
        if (rb == null) return;

        if (tipoFisica == TipoFisicaVeiculo50.Carro || tipoFisica == TipoFisicaVeiculo50.Moto)
        {
            float cmY = Mathf.Clamp(Mathf.Max(0.18f, raioRoda * 0.56f), 0.16f, 0.34f);
            rb.centerOfMass = new Vector3(0f, cmY, 0f);
            SetDamping(0.05f, 1.4f);

            suspCurso = Mathf.Clamp(vaoSolo * 0.72f + 0.18f, 0.24f, 0.54f);
            float rEfetivo = Mathf.Max(0.24f, raioRoda);
            suspRepouso = rEfetivo + suspCurso * 0.5f;
            suspMaxRay = suspRepouso + suspCurso * 0.5f;
        }
        else if (tipoFisica == TipoFisicaVeiculo50.Barco || tipoFisica == TipoFisicaVeiculo50.Hovercraft)
        {
            rb.centerOfMass = new Vector3(0f, 0.15f, 0f);
            SetDamping(0.8f, 2.2f);
        }
        else if (tipoFisica == TipoFisicaVeiculo50.Helicoptero || tipoFisica == TipoFisicaVeiculo50.Aviao)
        {
            rb.centerOfMass = new Vector3(0f, 0.6f, 0f);
            SetDamping(tipoFisica == TipoFisicaVeiculo50.Aviao ? 0.35f : 1.2f, 2.8f);
        }
    }

    private void Start()
    {
        AplicarConfigFisica();
        SalvarBasesRodas();

        dirAlvoIA = transform.forward;
        dirAlvoIA.y = 0f;
        if (dirAlvoIA.sqrMagnitude < 0.01f) dirAlvoIA = Vector3.forward;
        dirAlvoIA.Normalize();
        posCheckIA = transform.position;
        timerSensorIA = Random.Range(0f, 0.12f);

        if (geradorCidade == null)
        {
#if UNITY_2023_1_OR_NEWER
            geradorCidade = FindAnyObjectByType<GeradorCidadeInicial>();
#else
            geradorCidade = FindObjectOfType<GeradorCidadeInicial>();
#endif
        }

        if (!semaforosCarregados)
        {
            semaforosCarregados = true;
            semaforosCache.Clear();
#if UNITY_2023_1_OR_NEWER
            var sems = FindObjectsByType<CidadeSemaforoControlador>(FindObjectsSortMode.None);
#else
            var sems = FindObjectsOfType<CidadeSemaforoControlador>();
#endif
            for (int i = 0; i < sems.Length; i++)
                if (sems[i] != null) semaforosCache.Add(sems[i]);
        }

        ultimoEstadoLuzes = -1;
        AtualizarEmissivoLuzes(false);
    }

    private void SalvarBasesRodas()
    {
        if (basesRodasSalvas) return;
        basesRodasSalvas = true;
        baseYDianteiras.Clear();
        baseYTraseiras.Clear();
        for (int i = 0; i < rodasDianteiras.Count; i++)
            baseYDianteiras.Add(rodasDianteiras[i] != null ? rodasDianteiras[i].localPosition.y : raioRoda);
        for (int i = 0; i < rodasTraseiras.Count; i++)
            baseYTraseiras.Add(rodasTraseiras[i] != null ? rodasTraseiras[i].localPosition.y : raioRoda);
    }

    public void ConfigurarIA(Vector3 direcaoInicial, float velKmh)
    {
        modoIA = true;
        MotorLigado = true;
        usaGridIA = false;
        emVooPatrulhaIA = false;
        navegandoRioIA = false;
        velocidadeIAKmh = velKmh;
        direcaoInicial.y = 0f;
        dirAlvoIA = direcaoInicial.sqrMagnitude > 0.01f ? direcaoInicial.normalized : transform.forward;
        posCheckIA = transform.position;
        timerPresoIA = 0f;
    }

    public void ConfigurarViaGrid(float[] rx, float[] rz, float laneOff, int idxRua, bool eixoX, int sentido, float velKmh)
    {
        modoIA = true;
        MotorLigado = true;
        usaGridIA = true;
        emVooPatrulhaIA = false;
        navegandoRioIA = false;
        gridRuasX = rx;
        gridRuasZ = rz;
        gridLaneOff = laneOff;
        idxRuaAtual = idxRua;
        eixoXAtual = eixoX;
        sentidoAtual = sentido >= 0 ? 1 : -1;
        velocidadeIAKmh = velKmh;
        emCurvaCruzamento = false;
        dirAlvoIA = eixoXAtual ? new Vector3(sentidoAtual, 0f, 0f) : new Vector3(0f, 0f, sentidoAtual);
        idxCruzAlvo = EncontrarProximoCruzamento(transform.position, eixoXAtual, sentidoAtual);
        posCheckIA = transform.position;
        timerPresoIA = 0f;
    }

    public void ConfigurarHelicopteroIA(Vector3 centro, float raio, float altitude, float anguloInicial, float velAngular)
    {
        modoIA = true;
        MotorLigado = true;
        usaGridIA = false;
        navegandoRioIA = false;
        emVooPatrulhaIA = true;
        centroOrbitaIA = centro;
        raioOrbitaIA = Mathf.Max(20f, raio);
        altitudeAlvoIA = Mathf.Max(42f, altitude);
        anguloOrbitaIA = anguloInicial;
        velAngularOrbitaIA = velAngular;
        if (rb != null)
        {
            rb.useGravity = false;
            SetDamping(1.2f, 3f);
        }
    }

    public void ConfigurarBarcoIA(GeradorCidadeInicial cidade, float sInicial, int sentido, float maxS, float velKmh)
    {
        geradorCidade = cidade;
        modoIA = true;
        MotorLigado = true;
        usaGridIA = false;
        emVooPatrulhaIA = false;
        navegandoRioIA = true;
        rioSAtual = sInicial;
        rioSentido = sentido >= 0 ? 1 : -1;
        rioMaxS = Mathf.Max(25f, maxS);
        velocidadeIAKmh = velKmh;
    }

    private void Update()
    {
        float dt = Time.deltaTime;
        if (dt <= 0f) return;

        Camera cam = PegarCameraPrincipal();
        distCamSqCache = cam != null ? (cam.transform.position - transform.position).sqrMagnitude : 0f;

        if (!modoIA && emVooPatrulhaIA)
        {
            emVooPatrulhaIA = false;
            if (rb != null) rb.useGravity = true;
        }

        if (!MotorLigado)
        {
            inputAcel = 0f;
            inputGiro = 0f;
            inputSubir = 0f;
            inputFreio = true;
            inputTurbo = false;
        }
        else if (modoIA)
        {
            AtualizarCerebroIA(dt);
        }
        else
        {
            LerInputs();
            if (ApertouLuzes())
            {
                luzesLigadas = !luzesLigadas;
                AtualizarEmissivoLuzes(freandoAtivo);
            }
            if (ApertouPortas())
                portasAbertas = !portasAbertas;
        }

        float velSuav = Mathf.Sign(inputGiro) != Mathf.Sign(steerSuave) && Mathf.Abs(inputGiro) > 0.05f ? 11f : 7f;
        steerSuave = Mathf.MoveTowards(steerSuave, inputGiro, velSuav * dt);

        AnimarComponentes(dt);
    }

    public void DefinirPortasAbertas(bool abertas)
    {
        portasAbertas = abertas;
    }

    private void AtualizarCerebroIA(float dt)
    {
        if ((tipoFisica == TipoFisicaVeiculo50.Helicoptero || tipoFisica == TipoFisicaVeiculo50.Aviao) && emVooPatrulhaIA)
        {
            anguloOrbitaIA += velAngularOrbitaIA * dt;
            inputAcel = 0f;
            inputGiro = 0f;
            inputFreio = false;
            return;
        }

        if (tipoFisica == TipoFisicaVeiculo50.Barco && navegandoRioIA && geradorCidade != null)
        {
            AtualizarCerebroBarcoIA(dt);
            return;
        }

        if (usaGridIA && gridRuasX != null && gridRuasZ != null)
        {
            AtualizarCerebroGridIA(dt);
            return;
        }

        timerSensorIA -= dt;
        if (timerSensorIA <= 0f)
        {
            timerSensorIA = distCamSqCache > 8100f ? 0.24f : (distCamSqCache > 2500f ? 0.16f : 0.11f);
            DetectarPistaEObstaculos();
        }

        timerPresoIA += dt;
        if (timerPresoIA >= 3.5f)
        {
            if ((transform.position - posCheckIA).sqrMagnitude < 2.25f && freioIA < 0.5f)
                EscolherNovaDirecaoAsfalto(true);
            posCheckIA = transform.position;
            timerPresoIA = 0f;
        }

        AplicarDirecaoIA(velocidadeIAKmh);
    }

    private void AtualizarCerebroBarcoIA(float dt)
    {
        bool eixoX = geradorCidade.eixoRio == GeradorCidadeInicial.EixoRio.LesteOeste_X;
        float sAtual = eixoX ? transform.position.x : transform.position.z;
        if (sAtual > rioMaxS && rioSentido > 0) rioSentido = -1;
        else if (sAtual < -rioMaxS && rioSentido < 0) rioSentido = 1;

        float sAlvo = Mathf.Clamp(sAtual + rioSentido * 14f, -rioMaxS, rioMaxS);
        float cRio = geradorCidade.CentroRioEm(sAlvo);
        Vector3 alvo = eixoX ? new Vector3(sAlvo, transform.position.y, cRio) : new Vector3(cRio, transform.position.y, sAlvo);

        Vector3 dif = alvo - transform.position;
        dif.y = 0f;
        if (dif.sqrMagnitude > 0.01f) dirAlvoIA = dif.normalized;

        freioIA = 0f;
        Vector3 frente = transform.forward;
        frente.y = 0f;
        if (frente.sqrMagnitude > 0.001f) frente.Normalize();

        float ang = Vector3.SignedAngle(frente, dirAlvoIA, Vector3.up);
        inputGiro = Mathf.Clamp(ang / 28f, -1f, 1f);
        float alvoMs = velocidadeIAKmh / 3.6f;
        float atualMs = Vector3.Dot(Vel, transform.forward);
        inputAcel = atualMs < alvoMs ? 0.60f : 0.05f;
        inputFreio = false;
    }

    private void AtualizarCerebroGridIA(float dt)
    {
        Vector3 pos = transform.position;

        if (emCurvaCruzamento)
        {
            while (curvaT < 1f && PlanoDistSq(pos, Bezier(curvaP0, curvaP1, curvaP2, curvaT)) < 11f)
                curvaT += 0.14f;

            if (curvaT >= 1f)
                emCurvaCruzamento = false;
            else
                alvoPontoIA = Bezier(curvaP0, curvaP1, curvaP2, Mathf.Clamp01(curvaT + 0.18f));
        }

        if (!emCurvaCruzamento)
        {
            float[] eixosCruz = eixoXAtual ? gridRuasX : gridRuasZ;
            float cruzCoord = eixosCruz[Mathf.Clamp(idxCruzAlvo, 0, eixosCruz.Length - 1)];
            float coordAtual = eixoXAtual ? pos.x : pos.z;
            float distCruz = (cruzCoord - coordAtual) * sentidoAtual;

            float limCurva = ehVeiculoLongo ? 6.2f : 4.6f;
            if (distCruz <= limCurva)
                IniciarProximoSegmentoGrid(pos);

            if (!emCurvaCruzamento)
            {
                float laneCoord = eixoXAtual
                    ? (gridRuasZ[idxRuaAtual] - sentidoAtual * gridLaneOff)
                    : (gridRuasX[idxRuaAtual] + sentidoAtual * gridLaneOff);

                alvoPontoIA = eixoXAtual
                    ? new Vector3(pos.x + sentidoAtual * 9.0f, pos.y, laneCoord)
                    : new Vector3(laneCoord, pos.y, pos.z + sentidoAtual * 9.0f);
            }
        }

        Vector3 dif = alvoPontoIA - pos;
        dif.y = 0f;
        if (dif.sqrMagnitude > 0.04f)
            dirAlvoIA = dif.normalized;

        timerSensorIA -= dt;
        if (timerSensorIA <= 0f)
        {
            timerSensorIA = distCamSqCache > 8100f ? 0.22f : (distCamSqCache > 2500f ? 0.14f : 0.09f);
            DetectarObstaculosESemaforo();
        }

        // Recuperação anti-engasgo: se estiver travado atravessado na via, realinha suavemente
        timerPresoIA += dt;
        if (timerPresoIA >= 4.0f)
        {
            if (freioIA < 0.5f && (pos - posCheckIA).sqrMagnitude < 1.2f)
            {
                float angDesvio = Mathf.Abs(Vector3.SignedAngle(transform.forward, dirAlvoIA, Vector3.up));
                if (angDesvio > 55f)
                {
                    rb.MoveRotation(Quaternion.Slerp(rb.rotation, Quaternion.LookRotation(dirAlvoIA, Vector3.up), 0.65f));
                }
            }
            posCheckIA = pos;
            timerPresoIA = 0f;
        }

        float velAlvo = emCurvaCruzamento
            ? velocidadeIAKmh * (ehVeiculoLongo ? 0.50f : 0.66f)
            : velocidadeIAKmh;

        AplicarDirecaoIA(velAlvo);
    }

    private void IniciarProximoSegmentoGrid(Vector3 pos)
    {
        float[] eixosCruz = eixoXAtual ? gridRuasX : gridRuasZ;
        float[] eixosPerp = eixoXAtual ? gridRuasZ : gridRuasX;

        int proxReto = idxCruzAlvo + sentidoAtual;
        bool podeReto = proxReto >= 0 && proxReto < eixosCruz.Length;

        bool podePos = (idxRuaAtual + 1) < eixosPerp.Length;
        bool podeNeg = (idxRuaAtual - 1) >= 0;

        bool deveVirar = !podeReto;
        if (!deveVirar && (podePos || podeNeg))
        {
            float chanceVirar = ehVeiculoLongo ? 0.08f : 0.25f;
            deveVirar = Random.value < chanceVirar;
        }

        if (!deveVirar && podeReto)
        {
            idxCruzAlvo = proxReto;
            return;
        }

        if (!podePos && !podeNeg)
        {
            sentidoAtual = -sentidoAtual;
            idxCruzAlvo = Mathf.Clamp(idxCruzAlvo + sentidoAtual, 0, eixosCruz.Length - 1);
            return;
        }

        int novoSentido = (podePos && podeNeg) ? (Random.value < 0.5f ? 1 : -1) : (podePos ? 1 : -1);

        float cruzCoord = eixosCruz[idxCruzAlvo];
        if (eixoXAtual)
        {
            float laneInZ = gridRuasZ[idxRuaAtual] - sentidoAtual * gridLaneOff;
            float laneOutX = gridRuasX[idxCruzAlvo] + novoSentido * gridLaneOff;
            curvaP0 = new Vector3(cruzCoord - sentidoAtual * 4.6f, pos.y, laneInZ);
            curvaP1 = new Vector3(laneOutX, pos.y, laneInZ);
            curvaP2 = new Vector3(laneOutX, pos.y, gridRuasZ[idxRuaAtual] + novoSentido * 5.2f);
        }
        else
        {
            float laneInX = gridRuasX[idxRuaAtual] + sentidoAtual * gridLaneOff;
            float laneOutZ = gridRuasZ[idxCruzAlvo] - novoSentido * gridLaneOff;
            curvaP0 = new Vector3(laneInX, pos.y, cruzCoord - sentidoAtual * 4.6f);
            curvaP1 = new Vector3(laneInX, pos.y, laneOutZ);
            curvaP2 = new Vector3(gridRuasX[idxRuaAtual] + novoSentido * 5.2f, pos.y, laneOutZ);
        }

        int oldRua = idxRuaAtual;
        eixoXAtual = !eixoXAtual;
        idxRuaAtual = idxCruzAlvo;
        sentidoAtual = novoSentido;
        idxCruzAlvo = Mathf.Clamp(oldRua + novoSentido, 0, eixosPerp.Length - 1);
        emCurvaCruzamento = true;
        curvaT = 0f;
    }

    private int EncontrarProximoCruzamento(Vector3 pos, bool eixoX, int sentido)
    {
        float[] arr = eixoX ? gridRuasX : gridRuasZ;
        float coord = eixoX ? pos.x : pos.z;
        int melhor = sentido > 0 ? arr.Length - 1 : 0;
        float melhorDist = float.MaxValue;
        for (int i = 0; i < arr.Length; i++)
        {
            float d = (arr[i] - coord) * sentido;
            if (d > 1.5f && d < melhorDist)
            {
                melhorDist = d;
                melhor = i;
            }
        }
        return melhor;
    }

    private void AplicarDirecaoIA(float velAlvoKmh)
    {
        Vector3 frente = transform.forward;
        frente.y = 0f;
        if (frente.sqrMagnitude > 0.001f) frente.Normalize();

        float angulo = Vector3.SignedAngle(frente, dirAlvoIA, Vector3.up);
        inputGiro = Mathf.Clamp(angulo / 22f, -1f, 1f);
        inputTurbo = false;
        inputSubir = 0f;

        if (freioIA > 0.5f)
        {
            inputAcel = 0f;
            inputFreio = true;
        }
        else
        {
            float alvoMs = (velAlvoKmh * (Mathf.Abs(angulo) > 20f ? 0.65f : 1f)) / 3.6f;
            float atualMs = Vector3.Dot(Vel, transform.forward);
            inputAcel = atualMs < alvoMs ? 0.72f : 0.05f;
            inputFreio = false;
        }
    }

    private void DetectarObstaculosESemaforo()
    {
        freioIA = 0f;

        if (!emCurvaCruzamento && semaforosCache.Count > 0)
        {
            float[] eixosCruz = eixoXAtual ? gridRuasX : gridRuasZ;
            float cruzCoord = eixosCruz[Mathf.Clamp(idxCruzAlvo, 0, eixosCruz.Length - 1)];
            float coordAtual = eixoXAtual ? transform.position.x : transform.position.z;
            float distCruz = (cruzCoord - coordAtual) * sentidoAtual;

            if (distCruz > meioComprimento + 2.2f && distCruz < meioComprimento + 12f)
            {
                Vector3 centroCruz = eixoXAtual
                    ? new Vector3(cruzCoord, transform.position.y, gridRuasZ[idxRuaAtual])
                    : new Vector3(gridRuasX[idxRuaAtual], transform.position.y, cruzCoord);
                Vector3 dirReta = eixoXAtual ? new Vector3(sentidoAtual, 0f, 0f) : new Vector3(0f, 0f, sentidoAtual);

                for (int i = 0; i < semaforosCache.Count; i++)
                {
                    CidadeSemaforoControlador sem = semaforosCache[i];
                    if (sem == null) continue;
                    Vector3 d = sem.transform.position - centroCruz;
                    d.y = 0f;
                    if (d.sqrMagnitude < 16f * 16f && !sem.PodePassar(dirReta))
                    {
                        freioIA = 1f;
                        return;
                    }
                }
            }
        }

        Vector3 origem = transform.position + Vector3.up * 0.90f + transform.forward * (meioComprimento + 0.55f);
        int n = Physics.SphereCastNonAlloc(origem, 1.10f, transform.forward, bufSensor, 12.5f, ~0, QueryTriggerInteraction.Ignore);
        for (int i = 0; i < n; i++)
        {
            Collider c = bufSensor[i].collider;
            if (c == null || c.transform.IsChildOf(transform)) continue;
            string nm = c.name;
            if (nm.Contains("Asfalto") || nm.StartsWith("Calcada") || nm.Contains("Faixa") || nm.Contains("Tabuleiro") || nm.Contains("Ponte") || nm.Contains("Rampa"))
                continue;

            ControleVeiculo50 outro = c.GetComponentInParent<ControleVeiculo50>();
            if (outro != null)
            {
                float dot = Vector3.Dot(outro.transform.forward, transform.forward);
                if (bufSensor[i].distance < 10.5f && (dot > -0.35f || bufSensor[i].distance < 4.5f))
                {
                    freioIA = 1f;
                    return;
                }
                continue;
            }

            if (c.GetComponentInParent<NpcVidaPropria>() != null || c.GetComponentInParent<CidadePedestreAgente>() != null || c.GetComponentInParent<MovimentoJogador>() != null)
            {
                if (bufSensor[i].distance < 7.0f)
                {
                    freioIA = 1f;
                    return;
                }
            }
        }
    }

    private static float PlanoDistSq(Vector3 a, Vector3 b)
    {
        float dx = a.x - b.x;
        float dz = a.z - b.z;
        return dx * dx + dz * dz;
    }

    private static Vector3 Bezier(Vector3 p0, Vector3 p1, Vector3 p2, float t)
    {
        float u = 1f - t;
        return u * u * p0 + 2f * u * t * p1 + t * t * p2;
    }

    private void DetectarPistaEObstaculos()
    {
        freioIA = 0f;

        Vector3 origem = transform.position + Vector3.up * 0.90f + transform.forward * (meioComprimento + 0.55f);
        int n = Physics.SphereCastNonAlloc(origem, 1.05f, transform.forward, bufSensor, 11f, ~0, QueryTriggerInteraction.Ignore);
        for (int i = 0; i < n; i++)
        {
            Collider c = bufSensor[i].collider;
            if (c == null || c.transform.IsChildOf(transform)) continue;
            string nm = c.name;
            if (nm.Contains("Asfalto") || nm.StartsWith("Calcada") || nm.Contains("Faixa")) continue;
            if (c.GetComponentInParent<NpcVidaPropria>() != null)
            {
                if (bufSensor[i].distance < 4.5f) freioIA = 1f;
                continue;
            }
            if (bufSensor[i].distance < 9.0f)
            {
                freioIA = 1f;
                break;
            }
        }

        bool frenteLivre = TemAsfalto(transform.position + dirAlvoIA * 9.5f) &&
                           TemAsfalto(transform.position + dirAlvoIA * 4.5f);
        if (!frenteLivre)
            EscolherNovaDirecaoAsfalto(false);
    }

    private void EscolherNovaDirecaoAsfalto(bool forcarGiro)
    {
        Vector3 dirAtual = dirAlvoIA;
        Vector3 direita = Vector3.Cross(Vector3.up, dirAtual).normalized;
        Vector3 esquerda = -direita;

        int totalCand;
        if (forcarGiro)
        {
            candDirBuf[0] = direita; candDirBuf[1] = esquerda; candDirBuf[2] = -dirAtual; candDirBuf[3] = dirAtual;
            totalCand = 4;
        }
        else if (Random.value < 0.5f)
        {
            candDirBuf[0] = direita; candDirBuf[1] = esquerda; candDirBuf[2] = -dirAtual;
            totalCand = 3;
        }
        else
        {
            candDirBuf[0] = esquerda; candDirBuf[1] = direita; candDirBuf[2] = -dirAtual;
            totalCand = 3;
        }

        for (int i = 0; i < totalCand; i++)
        {
            Vector3 d = ArredondarEixo(candDirBuf[i]);
            if (TemAsfalto(transform.position + d * 8f) && TemAsfalto(transform.position + d * 14f))
            {
                dirAlvoIA = d;
                return;
            }
        }
        dirAlvoIA = -dirAtual;
    }

    private static Vector3 ArredondarEixo(Vector3 v)
    {
        return Mathf.Abs(v.x) > Mathf.Abs(v.z)
            ? new Vector3(Mathf.Sign(v.x), 0f, 0f)
            : new Vector3(0f, 0f, Mathf.Sign(v.z));
    }

    public static bool TemAsfalto(Vector3 pos)
    {
        int n = Physics.RaycastNonAlloc(pos + Vector3.up * 2.5f, Vector3.down, bufSensor, 6f, ~0, QueryTriggerInteraction.Ignore);
        float melhor = float.MaxValue;
        bool asfalto = false;
        for (int i = 0; i < n; i++)
        {
            Collider c = bufSensor[i].collider;
            if (c == null) continue;
            if (c.GetComponentInParent<ControleVeiculo50>() != null || c.GetComponentInParent<NpcVidaPropria>() != null) continue;
            if (bufSensor[i].distance < melhor)
            {
                melhor = bufSensor[i].distance;
                asfalto = c.name.Contains("Asfalto");
            }
        }
        return asfalto;
    }

    private void FixedUpdate()
    {
        float dt = Time.fixedDeltaTime;
        float velMs = Vector3.Dot(Vel, transform.forward);
        VelocidadeAtualKmh = Mathf.Abs(velMs) * 3.6f;

        if (tipoFisica == TipoFisicaVeiculo50.Helicoptero)
        {
            AtualizarFisicaHelicoptero(dt);
            return;
        }
        if (tipoFisica == TipoFisicaVeiculo50.Aviao)
        {
            AtualizarFisicaAviao(dt);
            return;
        }

        if (tipoFisica == TipoFisicaVeiculo50.Barco || tipoFisica == TipoFisicaVeiculo50.Hovercraft)
        {
            AtualizarFisicaAquatica(dt, velMs);
            if (tipoFisica == TipoFisicaVeiculo50.Barco) return;
        }

        AtualizarFisicaTerrestreGTA(dt, velMs);
    }

    private void AtualizarFisicaTerrestreGTA(float dt, float velMs)
    {
        if (!MotorLigado && !modoIA)
        {
            if (rb.IsSleeping()) return;
            if (EstaNoChao && Vel.sqrMagnitude < 0.012f && rb.angularVelocity.sqrMagnitude < 0.012f && Vector3.Dot(transform.up, Vector3.up) > 0.97f)
            {
                SetVelocity(Vector3.zero);
                rb.angularVelocity = Vector3.zero;
                rb.Sleep();
                return;
            }
        }

        bool motoInline = tipoFisica == TipoFisicaVeiculo50.Moto && !ehQuadriciclo;
        bool lodSuspSimples = modoIA && distCamSqCache > 5625f;
        int numRodas = lodSuspSimples ? 1 : (motoInline ? 2 : 4);

        float xOff = motoInline ? 0f : Mathf.Max(0.45f, largura * 0.42f);
        float zF = Mathf.Abs(zEixoDianteiro) > 0.2f ? zEixoDianteiro : Mathf.Max(0.65f, distanciaEixos * 0.5f);
        float zT = Mathf.Abs(zEixoTraseiro) > 0.2f ? zEixoTraseiro : -Mathf.Max(0.65f, distanciaEixos * 0.5f);

        if (lodSuspSimples)
        {
            pontosSuspLocal[0] = new Vector3(0f, suspRepouso, 0f);
        }
        else if (motoInline)
        {
            pontosSuspLocal[0] = new Vector3(0f, suspRepouso, zF);
            pontosSuspLocal[1] = new Vector3(0f, suspRepouso, zT);
        }
        else
        {
            pontosSuspLocal[0] = new Vector3(-xOff, suspRepouso, zF);
            pontosSuspLocal[1] = new Vector3( xOff, suspRepouso, zF);
            pontosSuspLocal[2] = new Vector3(-xOff, suspRepouso, zT);
            pontosSuspLocal[3] = new Vector3( xOff, suspRepouso, zT);
        }

        float springK = (rb.mass * 9.81f / numRodas) / Mathf.Max(0.05f, suspCurso * 0.5f);
        float damperC = 0.78f * 2f * Mathf.Sqrt(springK * (rb.mass / numRodas));
        float forcaMaxRoda = rb.mass * 9.81f * 3.0f / numRodas;

        int rodasNoChao = 0;
        Vector3 normalMedia = Vector3.zero;
        float somaDeltaF = 0f, somaDeltaT = 0f;
        int hitsF = 0, hitsT = 0;

        for (int i = 0; i < numRodas; i++)
        {
            Vector3 origem = transform.TransformPoint(pontosSuspLocal[i]);
            bool achou = RaycastChaoSemSi(origem, -transform.up, suspMaxRay, out RaycastHit hit);

            if (achou)
            {
                rodasNoChao++;
                hitRodas[i] = true;
                normalMedia += hit.normal;

                float comp = Mathf.Clamp(suspMaxRay - hit.distance, 0f, suspCurso);
                compRodas[i] = comp;

                float velSusp = Vector3.Dot(rb.GetPointVelocity(origem), transform.up);
                float forcaMola = Mathf.Clamp(springK * comp - damperC * velSusp, 0f, forcaMaxRoda);
                rb.AddForceAtPosition(transform.up * forcaMola, origem, ForceMode.Force);

                float deltaVis = Mathf.Clamp(suspRepouso - hit.distance, -suspCurso * 0.40f, suspCurso * 0.45f);
                if (lodSuspSimples)
                {
                    somaDeltaF += deltaVis; hitsF++;
                    somaDeltaT += deltaVis; hitsT++;
                }
                else
                {
                    bool ehDianteira = motoInline ? (i == 0) : (i < 2);
                    if (ehDianteira) { somaDeltaF += deltaVis; hitsF++; }
                    else { somaDeltaT += deltaVis; hitsT++; }
                }
            }
            else
            {
                hitRodas[i] = false;
                compRodas[i] = 0f;
            }
        }

        visualOffsetDianteiro = hitsF > 0 ? somaDeltaF / hitsF : -suspCurso * 0.25f;
        visualOffsetTraseiro = hitsT > 0 ? somaDeltaT / hitsT : -suspCurso * 0.25f;
        EstaNoChao = rodasNoChao > 0;

        // Barra estabilizadora (Anti-Roll) só atua quando as duas rodas do mesmo eixo estão apoiadas
        if (!motoInline && !lodSuspSimples)
        {
            float antiRollK = springK * 0.55f;
            if (hitRodas[0] && hitRodas[1])
            {
                float diffF = (compRodas[0] - compRodas[1]) * antiRollK;
                rb.AddForceAtPosition(transform.up * (-diffF), transform.TransformPoint(pontosSuspLocal[0]), ForceMode.Force);
                rb.AddForceAtPosition(transform.up * ( diffF), transform.TransformPoint(pontosSuspLocal[1]), ForceMode.Force);
            }
            if (hitRodas[2] && hitRodas[3])
            {
                float diffT = (compRodas[2] - compRodas[3]) * antiRollK;
                rb.AddForceAtPosition(transform.up * (-diffT), transform.TransformPoint(pontosSuspLocal[2]), ForceMode.Force);
                rb.AddForceAtPosition(transform.up * ( diffT), transform.TransformPoint(pontosSuspLocal[3]), ForceMode.Force);
            }
        }

        // Hovercraft usa sustentação extra sobre água
        if (tipoFisica == TipoFisicaVeiculo50.Hovercraft && !EstaNoChao)
            EstaNoChao = geradorCidade != null && transform.position.y <= geradorCidade.NivelAgua + 1.4f;

        if (EstaNoChao)
        {
            SetDamping(0.05f, modoIA ? 2.6f : 1.35f);
            Vector3 dirChao = rodasNoChao > 0 ? (normalMedia / rodasNoChao).normalized : Vector3.up;
            Vector3 frentePlano = Vector3.ProjectOnPlane(transform.forward, dirChao).normalized;
            if (frentePlano.sqrMagnitude < 0.01f) frentePlano = transform.forward;
            Vector3 direitaPlano = Vector3.ProjectOnPlane(transform.right, dirChao).normalized;
            if (direitaPlano.sqrMagnitude < 0.01f) direitaPlano = transform.right;

            float velMaxMs = (velocidadeMaxKmh / 3.6f) * (inputTurbo ? 1.25f : 1f);
            float velReMs = velocidadeReKmh / 3.6f;
            freandoAtivo = false;

            // Motor / Freio / Ré estilo GTA
            if (!MotorLigado)
            {
                AplicarFreioLinear(forcaFreio * 0.7f, dt);
            }
            else if (inputFreio && !modoIA)
            {
                // Freio de mão (Espaço): freia forte e solta a traseira para drift
                freandoAtivo = true;
                AplicarFreioLinear(forcaFreio * 0.78f, dt);
            }
            else if (modoIA && inputFreio)
            {
                freandoAtivo = true;
                AplicarFreioLinear(forcaFreio * 1.45f, dt);
            }
            else if (inputAcel > 0.05f)
            {
                if (velMs < -1.0f)
                {
                    freandoAtivo = true;
                    AplicarFreioLinear(forcaFreio * 1.55f, dt);
                }
                else if (velMs < velMaxMs)
                {
                    float frac = Mathf.Clamp01(velMs / Mathf.Max(1f, velMaxMs));
                    float curvaTorque = Mathf.Lerp(1.38f, 0.78f, frac) * (inputTurbo ? 1.35f : 1f);
                    rb.AddForce(frentePlano * (inputAcel * aceleracao * curvaTorque), ForceMode.Acceleration);
                }
            }
            else if (inputAcel < -0.05f)
            {
                if (velMs > 1.0f)
                {
                    freandoAtivo = true;
                    AplicarFreioLinear(forcaFreio * 1.65f, dt);
                }
                else if (velMs > -velReMs)
                {
                    rb.AddForce(frentePlano * (inputAcel * aceleracao * 0.82f), ForceMode.Acceleration);
                }
            }
            else
            {
                // Arrasto natural / freio-motor suave ao soltar W/S
                AplicarFreioLinear(1.8f, dt);
            }

            // Direção Ackermann responsiva + redução progressiva em alta velocidade
            float velGiroBase = modoIA && ehVeiculoLongo ? Mathf.Min(velocidadeGiro, 65f) : velocidadeGiro;
            float fatorVel = modoIA
                ? Mathf.Clamp01(Mathf.Abs(velMs) / 1.4f + 0.35f)
                : Mathf.Clamp01(Mathf.Abs(velMs) / 2.6f);
            float estabilidadeAltaVel = modoIA ? 1f : Mathf.Lerp(1.0f, 0.44f, Mathf.Clamp01(VelocidadeAtualKmh / 195f));
            float driftYawBoost = (!modoIA && inputFreio && Mathf.Abs(velMs) > 4f) ? 1.42f : 1.0f;
            float sentido = velMs >= -0.35f ? 1f : -1f;

            float yawDesejado = steerSuave * (velGiroBase * Mathf.Deg2Rad) * fatorVel * estabilidadeAltaVel * driftYawBoost * sentido;
            Vector3 angLocal = transform.InverseTransformDirection(rb.angularVelocity);
            float autoridadeYaw = modoIA ? 10f : 13.5f;
            float yawAccel = (yawDesejado - angLocal.y) * autoridadeYaw;
            rb.AddRelativeTorque(0f, yawAccel, 0f, ForceMode.Acceleration);

            // Aderência lateral dos pneus (alta normalmente, reduzida no Espaço para Drift GTA)
            float velLat = Vector3.Dot(Vel, direitaPlano);
            float gripBase = aderenciaLateral * (modoIA ? 1.45f : 1f);
            if (!modoIA && inputFreio && Mathf.Abs(velMs) > 4f)
                gripBase *= 0.28f;
            else if (tipoFisica == TipoFisicaVeiculo50.Hovercraft)
                gripBase *= 0.42f;

            float correcaoLat = Mathf.Clamp(-velLat * gripBase, -34f, 34f);
            rb.AddForce(direitaPlano * correcaoLat, ForceMode.Acceleration);

            // Downforce em alta velocidade (gruda esportivos no asfalto)
            float downforce = Mathf.Clamp(VelocidadeAtualKmh / 140f, 0f, 1.8f) * 4.5f;
            rb.AddForce(-dirChao * downforce, ForceMode.Acceleration);

            // Estabilização corretiva anti-empinada e de inclinação no chão
            EstabilizarInclinacaoNoChao(motoInline, dirChao, hitsF, hitsT, dt);
        }
        else
        {
            // No ar (rampas e saltos): controle estilo GTA + auto-nivelamento suave se inclinar demais
            SetDamping(0.03f, 0.75f);
            if (!modoIA && MotorLigado)
            {
                rb.AddRelativeTorque(inputAcel * 2.0f, inputGiro * 2.4f, -inputGiro * 1.4f, ForceMode.Acceleration);
            }
        }

        // Auto-desvirar estilo GTA se capotar completamente no chão
        if (!modoIA && MotorLigado && Vector3.Dot(transform.up, Vector3.up) < 0.22f && VelocidadeAtualKmh < 12f && Mathf.Abs(inputGiro) > 0.2f)
        {
            rb.AddRelativeTorque(0f, 0f, -inputGiro * 14f, ForceMode.Acceleration);
        }
    }

    private void EstabilizarInclinacaoNoChao(bool motoInline, Vector3 normalChao, int hitsF, int hitsT, float dt)
    {
        Vector3 angLocal = transform.InverseTransformDirection(rb.angularVelocity);
        Vector3 erroAlin = transform.InverseTransformDirection(Vector3.Cross(transform.up, normalChao));

        if (motoInline)
        {
            float rollAlvo = -steerSuave * inclinacaoCurva * Mathf.Clamp01(VelocidadeAtualKmh / 32f);
            Vector3 e = rb.rotation.eulerAngles;
            float errRoll = Mathf.DeltaAngle(e.z, rollAlvo);
            float torqueZ = errRoll * 0.44f - angLocal.z * 6.5f;
            float torqueX = erroAlin.x * 26f - angLocal.x * 5.2f;
            rb.AddRelativeTorque(torqueX, 0f, torqueZ, ForceMode.Acceleration);
        }
        else
        {
            // Se só um eixo está no chão (ex.: van/carro empinado), força retorno firme às 4 rodas
            bool eixoPerdido = (hitsF == 0 || hitsT == 0);
            float kPitch = eixoPerdido ? 48f : 14f;
            float kRoll = eixoPerdido ? 44f : 18f;
            float dPitch = eixoPerdido ? 5.0f : 3.2f;
            float dRoll = eixoPerdido ? 5.2f : 3.6f;

            rb.AddRelativeTorque(
                erroAlin.x * kPitch - angLocal.x * dPitch,
                0f,
                erroAlin.z * kRoll - angLocal.z * dRoll,
                ForceMode.Acceleration);
        }
    }

    private void AplicarFreioLinear(float taxa, float dt)
    {
        Vector3 vPlano = new Vector3(Vel.x, 0f, Vel.z);
        if (vPlano.sqrMagnitude < 0.002f) return;
        float decel = Mathf.Min(vPlano.magnitude / dt, taxa);
        rb.AddForce(-vPlano.normalized * decel, ForceMode.Acceleration);
    }

    private bool RaycastChaoSemSi(Vector3 origem, Vector3 dir, float maxDist, out RaycastHit melhorHit)
    {
        int n = Physics.RaycastNonAlloc(origem, dir, bufSusp, maxDist, ~0, QueryTriggerInteraction.Ignore);
        float minD = float.MaxValue;
        bool achou = false;
        melhorHit = default;

        for (int i = 0; i < n; i++)
        {
            Collider c = bufSusp[i].collider;
            if (c == null || c.transform.IsChildOf(transform)) continue;
            if (bufSusp[i].distance < minD)
            {
                minD = bufSusp[i].distance;
                melhorHit = bufSusp[i];
                achou = true;
            }
        }
        return achou;
    }

    private void AtualizarFisicaAquatica(float dt, float velMs)
    {
        float nivelAgua = geradorCidade != null ? geradorCidade.NivelAgua : 0f;
        bool naAgua = geradorCidade == null ||
                      (transform.position.y <= nivelAgua + 1.25f &&
                       (!geradorCidade.criarRio || geradorCidade.RetanguloSobreRio(transform.position.x, transform.position.z, 1f, 1f)));

        if (naAgua)
        {
            float prof = nivelAgua - transform.position.y;
            if (prof > -0.35f)
            {
                float empuxo = Mathf.Clamp((prof + 0.35f) * 26f, 0f, 38f);
                rb.AddForce(Vector3.up * empuxo, ForceMode.Acceleration);
                SetDamping(1.1f, 2.6f);
            }

            if (tipoFisica == TipoFisicaVeiculo50.Barco)
            {
                float velMaxMs = velocidadeMaxKmh / 3.6f;
                if (MotorLigado && Mathf.Abs(inputAcel) > 0.05f && Mathf.Abs(velMs) < velMaxMs)
                    rb.AddForce(transform.forward * (inputAcel * aceleracao), ForceMode.Acceleration);

                float fator = Mathf.Clamp01(Mathf.Abs(velMs) / 2.0f + 0.35f);
                float yaw = steerSuave * (velocidadeGiro * 0.72f * Mathf.Deg2Rad) * fator;
                Vector3 angL = transform.InverseTransformDirection(rb.angularVelocity);
                rb.AddRelativeTorque(0f, (yaw - angL.y) * 8f, 0f, ForceMode.Acceleration);

                Vector3 velLat = Vector3.Project(Vel, transform.right);
                rb.AddForce(-velLat * 4.8f, ForceMode.Acceleration);

                Vector3 e = rb.rotation.eulerAngles;
                float rollAlvo = -steerSuave * 9f * Mathf.Clamp01(VelocidadeAtualKmh / 35f);
                float pitchAlvo = -Mathf.Clamp(inputAcel, -1f, 1f) * 5f;
                rb.AddRelativeTorque(Mathf.DeltaAngle(e.x, pitchAlvo) * 0.25f - angL.x * 4f, 0f, Mathf.DeltaAngle(e.z, rollAlvo) * 0.35f - angL.z * 4f, ForceMode.Acceleration);
            }
        }
        else if (tipoFisica == TipoFisicaVeiculo50.Barco)
        {
            SetDamping(0.2f, 1.5f);
        }
    }

    private void AtualizarFisicaHelicoptero(float dt)
    {
        if (modoIA && emVooPatrulhaIA)
        {
            rb.useGravity = false;
            SetDamping(1.2f, 3.0f);

            Vector3 alvoPos = centroOrbitaIA + new Vector3(
                Mathf.Cos(anguloOrbitaIA) * raioOrbitaIA,
                altitudeAlvoIA,
                Mathf.Sin(anguloOrbitaIA) * raioOrbitaIA);

            Vector3 dif = alvoPos - transform.position;
            Vector3 velDesejada = dif.sqrMagnitude > 1f ? dif.normalized * (velocidadeIAKmh / 3.6f) : Vector3.zero;
            SetVelocity(Vector3.Lerp(Vel, velDesejada, 2.5f * dt));

            Vector3 dirFrente = new Vector3(velDesejada.x, 0f, velDesejada.z);
            if (dirFrente.sqrMagnitude > 0.05f)
            {
                Quaternion rotAlvo = Quaternion.LookRotation(dirFrente.normalized, Vector3.up) * Quaternion.Euler(7f, 0f, -10f);
                rb.MoveRotation(Quaternion.Slerp(rb.rotation, rotAlvo, 3f * dt));
            }
            return;
        }

        rb.useGravity = true;
        SetDamping(1.25f, 3.0f);

        if (MotorLigado)
        {
            float hoverDamp = Mathf.Abs(inputSubir) < 0.05f ? -Vel.y * 2.2f : 0f;
            float empuxoBase = 9.81f + inputSubir * 16f + hoverDamp;
            rb.AddForce(Vector3.up * empuxoBase, ForceMode.Acceleration);

            Vector3 frentePlana = Vector3.ProjectOnPlane(transform.forward, Vector3.up).normalized;
            rb.AddForce(frentePlana * (inputAcel * aceleracao * 1.45f), ForceMode.Acceleration);

            Vector3 angL = transform.InverseTransformDirection(rb.angularVelocity);
            float yawTarget = steerSuave * (velocidadeGiro * 0.85f * Mathf.Deg2Rad);
            rb.AddRelativeTorque(0f, (yawTarget - angL.y) * 8f, 0f, ForceMode.Acceleration);
        }

        Vector3 e = rb.rotation.eulerAngles;
        float pitchAlvo = MotorLigado ? inputAcel * 14f : 0f;
        float rollAlvo = MotorLigado ? -steerSuave * 16f : 0f;
        Vector3 angLocal = transform.InverseTransformDirection(rb.angularVelocity);
        rb.AddRelativeTorque(
            Mathf.DeltaAngle(e.x, pitchAlvo) * 0.30f - angLocal.x * 4.5f,
            0f,
            Mathf.DeltaAngle(e.z, rollAlvo) * 0.35f - angLocal.z * 4.5f,
            ForceMode.Acceleration);
    }

    private void AtualizarFisicaAviao(float dt)
    {
        if (modoIA && emVooPatrulhaIA)
        {
            rb.useGravity = false;
            SetDamping(0.4f, 2.5f);
            Vector3 alvoPos = centroOrbitaIA + new Vector3(
                Mathf.Cos(anguloOrbitaIA) * (raioOrbitaIA * 1.45f),
                altitudeAlvoIA + 18f,
                Mathf.Sin(anguloOrbitaIA) * (raioOrbitaIA * 1.45f));
            Vector3 dif = alvoPos - transform.position;
            Vector3 velDesejada = dif.sqrMagnitude > 1f ? dif.normalized * Mathf.Max(26f, velocidadeIAKmh / 3.6f) : transform.forward * 28f;
            SetVelocity(Vector3.Lerp(Vel, velDesejada, 2.2f * dt));
            if (velDesejada.sqrMagnitude > 0.1f)
            {
                Quaternion rotAlvo = Quaternion.LookRotation(velDesejada.normalized, Vector3.up) * Quaternion.Euler(0f, 0f, -18f);
                rb.MoveRotation(Quaternion.Slerp(rb.rotation, rotAlvo, 2.8f * dt));
            }
            return;
        }

        rb.useGravity = true;
        SetDamping(0.28f, 2.4f);

        float velFrente = Mathf.Max(0f, Vector3.Dot(Vel, transform.forward));
        float velMaxMs = velocidadeMaxKmh / 3.6f;

        if (MotorLigado)
        {
            float empuxo = (inputAcel > 0f ? inputAcel * 1.4f : 0.45f) * aceleracao * (inputTurbo ? 1.35f : 1f);
            if (velFrente < velMaxMs)
                rb.AddForce(transform.forward * empuxo, ForceMode.Acceleration);

            float sustentacao = Mathf.Clamp(velFrente / 16f, 0f, 1.45f) * 9.81f + inputSubir * 12f;
            rb.AddForce(Vector3.up * sustentacao, ForceMode.Acceleration);

            Vector3 velLat = Vector3.Project(Vel, transform.right);
            rb.AddForce(-velLat * 2.5f, ForceMode.Acceleration);

            Vector3 e = rb.rotation.eulerAngles;
            float pitchAlvo = -inputSubir * 22f;
            float rollAlvo = -steerSuave * 32f;
            Vector3 angLocal = transform.InverseTransformDirection(rb.angularVelocity);
            float yawRate = steerSuave * (velocidadeGiro * 0.65f * Mathf.Deg2Rad);
            rb.AddRelativeTorque(
                Mathf.DeltaAngle(e.x, pitchAlvo) * 0.28f - angLocal.x * 4f,
                (yawRate - angLocal.y) * 5.5f,
                Mathf.DeltaAngle(e.z, rollAlvo) * 0.34f - angLocal.z * 4f,
                ForceMode.Acceleration);
        }
    }

    private void AnimarComponentes(float dt)
    {
        if (distCamSqCache > 9025f)
            return;

        float velMs = Vector3.Dot(Vel, transform.forward);
        float rVis = Mathf.Max(0.20f, raioRoda);
        anguloRodas += (velMs / rVis) * Mathf.Rad2Deg * dt;
        AnguloGuidaoAtual = Mathf.Lerp(AnguloGuidaoAtual, steerSuave * 30f, 12f * dt);

        if (volantePivo != null)
        {
            volantePivo.localRotation = Quaternion.Euler(24f, 0f, -AnguloGuidaoAtual * 2.4f);
        }
        if (guidaoPivo != null)
        {
            guidaoPivo.localRotation = Quaternion.Euler(0f, AnguloGuidaoAtual, 0f);
        }
        if (pedivelaPivo != null)
        {
            float angPedivela = anguloRodas * 0.68f;
            pedivelaPivo.localRotation = Quaternion.Euler(angPedivela, 0f, 0f);
            for (int i = 0; i < pedais.Count; i++)
                if (pedais[i] != null) pedais[i].localRotation = Quaternion.Euler(-angPedivela, 0f, 0f);
        }

        float steerRodaFrente = (ehBicicleta && guidaoPivo != null) ? 0f : AnguloGuidaoAtual;
        for (int i = 0; i < rodasDianteiras.Count; i++)
        {
            Transform r = rodasDianteiras[i];
            if (r == null) continue;
            r.localRotation = Quaternion.Euler(anguloRodas, steerRodaFrente, 0f);
            if (i < baseYDianteiras.Count && !(ehBicicleta && guidaoPivo != null))
            {
                Vector3 lp = r.localPosition;
                lp.y = Mathf.Lerp(lp.y, baseYDianteiras[i] + visualOffsetDianteiro, 16f * dt);
                r.localPosition = lp;
            }
        }

        for (int i = 0; i < rodasTraseiras.Count; i++)
        {
            Transform r = rodasTraseiras[i];
            if (r == null) continue;
            r.localRotation = Quaternion.Euler(anguloRodas, 0f, 0f);
            if (i < baseYTraseiras.Count)
            {
                Vector3 lp = r.localPosition;
                lp.y = Mathf.Lerp(lp.y, baseYTraseiras[i] + visualOffsetTraseiro, 16f * dt);
                r.localPosition = lp;
            }
        }

        float velRotor = MotorLigado ? 950f : 40f;
        for (int i = 0; i < rotores.Count; i++)
        {
            if (rotores[i] == null) continue;
            bool ehCauda = rotores[i].name.Contains("Cauda") || rotores[i].name.Contains("Fenestron");
            if (ehCauda) rotores[i].Rotate(Vector3.right, velRotor * 1.3f * dt, Space.Self);
            else rotores[i].Rotate(Vector3.up, velRotor * dt, Space.Self);
        }

        for (int i = 0; i < helices.Count; i++)
            if (helices[i] != null) helices[i].Rotate(Vector3.forward, (MotorLigado ? 820f : 0f) * dt, Space.Self);

        for (int i = 0; i < chamasJato.Count; i++)
        {
            Transform ch = chamasJato[i];
            if (ch == null) continue;
            ch.gameObject.SetActive(MotorLigado);
            if (MotorLigado)
            {
                float pulso = 0.88f + 0.14f * Mathf.Sin(Time.time * 38f + i * 1.7f);
                ch.localScale = new Vector3(pulso, pulso, 0.8f + 0.3f * pulso);
                ch.Rotate(Vector3.forward, 540f * dt, Space.Self);
            }
        }

        if (tamborBetoneira != null)
            tamborBetoneira.Rotate(Vector3.forward, 55f * dt, Space.Self);

        for (int i = 0; i < escovasVarredoura.Count; i++)
            if (escovasVarredoura[i] != null)
                escovasVarredoura[i].Rotate(Vector3.up, (i % 2 == 0 ? 280f : -280f) * dt, Space.Self);

        if (luzesLigadas && (giroflexVermelho.Count > 0 || giroflexAzul.Count > 0 || giroflexAmbar.Count > 0))
        {
            tempoPisca += dt * 10f;
            bool fase = Mathf.Sin(tempoPisca) > 0f;
            SetEmissao(giroflexVermelho, Color.red, fase ? Color.red * 2.4f : Color.red * 0.15f);
            SetEmissao(giroflexAzul, Color.blue, !fase ? Color.blue * 2.4f : Color.blue * 0.15f);
            float ambar = 0.4f + Mathf.Abs(Mathf.Sin(tempoPisca * 0.5f)) * 1.8f;
            SetEmissao(giroflexAmbar, new Color(1f, 0.7f, 0.05f), new Color(1f, 0.6f, 0f) * ambar);
        }

        if (modoIA || MotorLigado)
            AtualizarEmissivoLuzes(freandoAtivo || inputFreio);

        float alvoPorta = portasAbertas ? 1f : 0f;
        if (portasArticuladas.Count > 0 && Mathf.Abs(aberturaPortasAtual - alvoPorta) > 0.001f)
        {
            aberturaPortasAtual = Mathf.MoveTowards(aberturaPortasAtual, alvoPorta, dt * 3.2f);
            float tSuave = Mathf.SmoothStep(0f, 1f, aberturaPortasAtual);
            for (int i = 0; i < portasArticuladas.Count; i++)
            {
                PortaArticulada50 p = portasArticuladas[i];
                if (p == null || p.pivo == null) continue;
                if (!p.inicializada)
                {
                    p.rotFechada = p.pivo.localRotation;
                    p.posFechada = p.pivo.localPosition;
                    p.inicializada = true;
                }
                p.pivo.localRotation = p.rotFechada * Quaternion.Euler(p.rotacaoAbertaEuler * tSuave);
                p.pivo.localPosition = p.posFechada + p.deslocamentoAbertoLocal * tSuave;
            }
        }
    }

    private void AtualizarEmissivoLuzes(bool freando)
    {
        int estado = (luzesLigadas ? 1 : 0) | (freando ? 2 : 0);
        if (estado == ultimoEstadoLuzes) return;
        ultimoEstadoLuzes = estado;

        Color farolBase = luzesLigadas ? new Color(1f, 0.97f, 0.85f) : new Color(0.75f, 0.78f, 0.82f);
        SetEmissao(farois, farolBase, luzesLigadas ? new Color(1f, 0.95f, 0.75f) * 1.6f : Color.black);
        SetEmissao(lanternas, new Color(0.65f, 0.05f, 0.05f), Color.red * (freando ? 2.4f : (luzesLigadas ? 1.2f : 0f)));

        if (!luzesLigadas)
        {
            SetEmissao(giroflexVermelho, Color.red, Color.black);
            SetEmissao(giroflexAzul, Color.blue, Color.black);
            SetEmissao(giroflexAmbar, new Color(1f, 0.7f, 0.05f), Color.black);
        }
    }

    private static void SetEmissao(List<Renderer> lista, Color baseCor, Color emissao)
    {
        if (lista.Count == 0) return;
        if (mpb == null) mpb = new MaterialPropertyBlock();

        for (int i = 0; i < lista.Count; i++)
        {
            Renderer r = lista[i];
            if (r == null) continue;
            r.GetPropertyBlock(mpb);
            mpb.SetColor("_BaseColor", baseCor);
            mpb.SetColor("_Color", baseCor);
            mpb.SetColor("_EmissionColor", emissao);
            r.SetPropertyBlock(mpb);
        }
    }

    private void LerInputs()
    {
        inputAcel = 0f; inputGiro = 0f; inputSubir = 0f;
        inputFreio = false; inputTurbo = false;

#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null)
        {
            var kb = Keyboard.current;
            if (kb.wKey.isPressed || kb.upArrowKey.isPressed) inputAcel += 1f;
            if (kb.sKey.isPressed || kb.downArrowKey.isPressed) inputAcel -= 1f;
            if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) inputGiro += 1f;
            if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) inputGiro -= 1f;
            if (kb.spaceKey.isPressed) { inputFreio = true; inputSubir += 1f; }
            if (kb.leftCtrlKey.isPressed || kb.cKey.isPressed) inputSubir -= 1f;
            inputTurbo = kb.leftShiftKey.isPressed || kb.rightShiftKey.isPressed;
        }
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        if (Mathf.Abs(inputAcel) < 0.01f) inputAcel = Input.GetAxisRaw("Vertical");
        if (Mathf.Abs(inputGiro) < 0.01f) inputGiro = Input.GetAxisRaw("Horizontal");
        inputFreio |= Input.GetKey(KeyCode.Space);
        if (Input.GetKey(KeyCode.Space)) inputSubir += 1f;
        if (Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.C)) inputSubir -= 1f;
        inputTurbo |= Input.GetKey(KeyCode.LeftShift);
#endif
    }

    private static bool ApertouLuzes()
    {
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null && Keyboard.current.lKey.wasPressedThisFrame) return true;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        if (Input.GetKeyDown(KeyCode.L)) return true;
#endif
        return false;
    }

    private static bool ApertouPortas()
    {
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null && Keyboard.current.gKey.wasPressedThisFrame) return true;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        if (Input.GetKeyDown(KeyCode.G)) return true;
#endif
        return false;
    }
}
`;
}

export function generateInteragirVeiculo50Cs(): string {
  return `using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

/// <summary>
/// Permite entrar, roubar carros em movimento (ejetando motorista) e sair com E ou F.
/// Integra automaticamente com MovimentoJogador, AparenciaPersonagem, CameraGTA e NpcVidaPropria.
/// </summary>
[RequireComponent(typeof(ControleVeiculo50))]
public class InteragirVeiculo50 : MonoBehaviour
{
    public float distanciaEntrar = 4.5f;
    public Vector3 offsetSaida = new Vector3(-2.4f, 0.6f, 0f);
    public Vector3 assentoVisivelLocal = new Vector3(0f, 0.55f, -0.1f);
    public bool veiculoAbertoSemTeto = false;
    public bool ejetarMotoristaAoRoubar = true;

    private ControleVeiculo50 controle;
    private bool dentro = false;

    private static InteragirVeiculo50 veiculoAtualGlobal;
    private static GameObject jogadorCache;
    private static MovimentoJogador movCache;
    private static AparenciaPersonagem aparCache;
    private static CameraGTA camCache;
    private static int ultimoFrameProcessado = -1;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetarEstaticos()
    {
        veiculoAtualGlobal = null;
        jogadorCache = null;
        movCache = null;
        aparCache = null;
        camCache = null;
        ultimoFrameProcessado = -1;
    }

    private void Awake()
    {
        controle = GetComponent<ControleVeiculo50>();
    }

    private static void AtualizarReferencias()
    {
        if (jogadorCache == null)
        {
            try { jogadorCache = GameObject.FindGameObjectWithTag("Player"); } catch { }
            if (jogadorCache == null)
            {
#if UNITY_2023_1_OR_NEWER
                MovimentoJogador mj = FindAnyObjectByType<MovimentoJogador>();
#else
                MovimentoJogador mj = FindObjectOfType<MovimentoJogador>();
#endif
                if (mj != null) jogadorCache = mj.gameObject;
            }
        }
        if (jogadorCache != null)
        {
            if (movCache == null) movCache = jogadorCache.GetComponent<MovimentoJogador>();
            if (aparCache == null) aparCache = jogadorCache.GetComponent<AparenciaPersonagem>();
        }
        if (camCache == null)
        {
#if UNITY_2023_1_OR_NEWER
            camCache = FindAnyObjectByType<CameraGTA>();
#else
            camCache = FindObjectOfType<CameraGTA>();
#endif
        }
    }

    private void Update()
    {
        if (Time.frameCount == ultimoFrameProcessado) return;
        if (!ApertouTeclaInteracao()) return;

        // Se já está dirigindo algum veículo, só o veículo atual processa a saída
        if (veiculoAtualGlobal != null)
        {
            if (veiculoAtualGlobal == this)
            {
                ultimoFrameProcessado = Time.frameCount;
                Sair();
            }
            return;
        }

        AtualizarReferencias();
        if (jogadorCache == null) return;

        // Escolhe o veículo mais próximo dentre todos os registrados (1 checagem por clique de E/F!)
        InteragirVeiculo50 maisProximo = null;
        float menorDistSq = float.MaxValue;
        Vector3 posJ = jogadorCache.transform.position;

        var lista = ControleVeiculo50.Todos;
        for (int i = 0; i < lista.Count; i++)
        {
            ControleVeiculo50 c = lista[i];
            if (c == null) continue;
            InteragirVeiculo50 inter = c.GetComponent<InteragirVeiculo50>();
            if (inter == null) continue;
            float dSq = (posJ - c.transform.position).sqrMagnitude;
            if (dSq <= inter.distanciaEntrar * inter.distanciaEntrar && dSq < menorDistSq)
            {
                menorDistSq = dSq;
                maisProximo = inter;
            }
        }

        if (maisProximo != null)
        {
            ultimoFrameProcessado = Time.frameCount;
            maisProximo.Entrar();
        }
    }

    private void Entrar()
    {
        if (controle.modoIA && ejetarMotoristaAoRoubar)
            EjetarMotorista();

        controle.modoIA = false;
        controle.MotorLigado = true;
        dentro = true;
        veiculoAtualGlobal = this;

        if (movCache != null) movCache.DefinirEmVeiculo(true);

        jogadorCache.transform.SetParent(transform, false);
        jogadorCache.transform.localPosition = assentoVisivelLocal;
        jogadorCache.transform.localRotation = Quaternion.identity;

        if (aparCache != null)
        {
            if (veiculoAbertoSemTeto)
            {
                aparCache.DefinirVisibilidade(true);
                aparCache.DefinirPosePilotagem(true, 0f, 0f);
            }
            else
            {
                aparCache.DefinirVisibilidade(false);
            }
        }
        else if (!veiculoAbertoSemTeto)
        {
            jogadorCache.SetActive(false);
        }

        if (camCache != null)
        {
            AjustarCameraVeiculo(true);
            camCache.TrocarAlvo(transform, true);
        }

        controle.DefinirPortasAbertas(false);
        CidadeHUD.Notificar("Dirigindo: " + controle.nomeModelo + " [" + controle.rankDesempenho + " · " + controle.classeUnity + "] · Espaço = Drift · L = Faróis · G = Portas");
    }

    private void EjetarMotorista()
    {
        Vector3 posEjetar = transform.TransformPoint(new Vector3(Mathf.Abs(offsetSaida.x) + 1.15f, 0.35f, 0f));
        if (Physics.Raycast(posEjetar + Vector3.up * 1.5f, Vector3.down, out RaycastHit hit, 5f, ~0, QueryTriggerInteraction.Ignore))
            posEjetar = hit.point + Vector3.up * 0.12f;
        GameObject npcGo = new GameObject("Motorista_Ejetado");
        npcGo.transform.position = posEjetar;
        npcGo.transform.rotation = Quaternion.Euler(0f, transform.eulerAngles.y + 90f, 0f);
        npcGo.AddComponent<NpcVidaPropria>();
        Destroy(npcGo, 18f);
    }

    private void LateUpdate()
    {
        if (dentro && veiculoAbertoSemTeto && aparCache != null)
            aparCache.DefinirPosePilotagem(true, controle.VelocidadeAtualKmh * 0.05f, controle.AnguloGuidaoAtual);
    }

    private void Sair()
    {
        dentro = false;
        if (veiculoAtualGlobal == this) veiculoAtualGlobal = null;
        controle.MotorLigado = false;
        controle.modoIA = false;

        if (jogadorCache != null)
        {
            jogadorCache.transform.SetParent(null, true);
            jogadorCache.transform.position = CalcularPosicaoSaidaSegura();
            jogadorCache.transform.rotation = Quaternion.Euler(0f, transform.eulerAngles.y, 0f);
            jogadorCache.SetActive(true);
        }

        if (aparCache != null)
        {
            aparCache.DefinirPosePilotagem(false, 0f, 0f);
            aparCache.DefinirVisibilidade(true);
        }

        if (movCache != null) movCache.DefinirEmVeiculo(false);

        if (camCache != null && jogadorCache != null)
        {
            AjustarCameraVeiculo(false);
            camCache.TrocarAlvo(jogadorCache.transform, false);
        }
    }

    private void AjustarCameraVeiculo(bool entrando)
    {
        if (camCache == null || camCache.perfilVeiculo == null) return;
        if (!entrando)
        {
            camCache.perfilVeiculo.distancia = 7.5f;
            camCache.perfilVeiculo.distanciaMin = 4.5f;
            camCache.perfilVeiculo.distanciaMax = 14f;
            camCache.perfilVeiculo.alturaFoco = 1.6f;
            return;
        }

        if (controle.tipoFisica == TipoFisicaVeiculo50.Moto)
        {
            camCache.perfilVeiculo.distancia = 4.8f;
            camCache.perfilVeiculo.distanciaMin = 3.0f;
            camCache.perfilVeiculo.distanciaMax = 9.0f;
            camCache.perfilVeiculo.alturaFoco = 1.25f;
        }
        else if (controle.comprimento >= 7.5f || controle.tipoFisica == TipoFisicaVeiculo50.Helicoptero)
        {
            float dist = Mathf.Clamp(controle.comprimento * 0.95f + 2.5f, 9.5f, 17f);
            camCache.perfilVeiculo.distancia = dist;
            camCache.perfilVeiculo.distanciaMin = 6.5f;
            camCache.perfilVeiculo.distanciaMax = dist + 6f;
            camCache.perfilVeiculo.alturaFoco = Mathf.Clamp(controle.altura * 0.72f, 1.8f, 3.2f);
        }
        else
        {
            camCache.perfilVeiculo.distancia = Mathf.Clamp(controle.comprimento * 1.1f + 2.0f, 6.4f, 8.8f);
            camCache.perfilVeiculo.distanciaMin = 4.0f;
            camCache.perfilVeiculo.distanciaMax = 14f;
            camCache.perfilVeiculo.alturaFoco = Mathf.Clamp(controle.altura * 0.85f, 1.35f, 2.0f);
        }
    }

    private Vector3 CalcularPosicaoSaidaSegura()
    {
        Vector3[] candidatos =
        {
            offsetSaida,
            new Vector3(-offsetSaida.x, offsetSaida.y, offsetSaida.z),
            new Vector3(0f, offsetSaida.y + 0.5f, -controle.meioComprimento - 1.2f)
        };

        for (int i = 0; i < candidatos.Length; i++)
        {
            Vector3 p = transform.TransformPoint(candidatos[i]);
            Vector3 dir = (p - transform.position);
            dir.y = 0f;
            float dist = dir.magnitude;
            if (dist > 0.1f && Physics.Raycast(transform.position + Vector3.up * 0.8f, dir.normalized, dist, ~0, QueryTriggerInteraction.Ignore))
                continue;

            if (Physics.Raycast(p + Vector3.up * 1.5f, Vector3.down, out RaycastHit hit, 5f, ~0, QueryTriggerInteraction.Ignore))
                return hit.point + Vector3.up * 0.12f;

            return p;
        }

        return transform.position + Vector3.up * (controle.altura + 0.35f);
    }

    private static bool ApertouTeclaInteracao()
    {
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null &&
            (Keyboard.current.eKey.wasPressedThisFrame || Keyboard.current.fKey.wasPressedThisFrame))
            return true;
#endif
#if ENABLE_LEGACY_INPUT_MANAGER
        if (Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.F))
            return true;
#endif
        return false;
    }
}
`;
}

export function generateFabrica50VeiculosCs(vehicles: VehicleConcept[]): string {
  const rows = vehicles
    .map((v) => {
      const tipo =
        v.unitySpec.controlType === 'MotoControle'
          ? 'TipoFisicaVeiculo50.Moto'
          : v.unitySpec.controlType === 'BarcoControle'
            ? v.geometry.archetype === 'hovercraft'
              ? 'TipoFisicaVeiculo50.Hovercraft'
              : 'TipoFisicaVeiculo50.Barco'
            : v.unitySpec.controlType === 'AeronaveControle'
              ? (v.geometry.archetype === 'airplane' || v.geometry.archetype === 'jet'
                ? 'TipoFisicaVeiculo50.Aviao'
                : 'TipoFisicaVeiculo50.Helicoptero')
              : 'TipoFisicaVeiculo50.Carro';

      const extras = v.geometry.attachments.join(',');
      const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const classeUnity = esc(v.tierClass ?? v.category);
      const rank = esc(v.performanceRank ?? 'Classe B');
      const descClass = esc(v.classificationDescription ?? v.roleInCity);
      return `        new DefVeiculo { codigo="${v.code}", nome="${esc(v.name)}", categoria="${esc(v.category)}", classeUnity="${classeUnity}", rank="${rank}", descricao="${descClass}", arquetipo="${v.geometry.archetype}", tipo=${tipo}, comp=${v.dimensions.length.toFixed(2)}f, larg=${v.dimensions.width.toFixed(2)}f, alt=${v.dimensions.height.toFixed(2)}f, eixos=${v.dimensions.wheelbase.toFixed(2)}f, raioRoda=${v.geometry.wheelRadius.toFixed(2)}f, largRoda=${v.geometry.wheelWidth.toFixed(2)}f, vao=${v.geometry.groundClearance.toFixed(2)}f, capCabin=${v.geometry.cabinLengthRatio.toFixed(2)}f, altCabin=${v.geometry.cabinHeightRatio.toFixed(2)}f, corPrim="${v.palette.primary}", corSec="${v.palette.secondary}", corDest="${v.palette.accent}", velMax=${v.unitySpec.maxSpeedKmh}f, acel=${(v.unitySpec.acceleration * 2.2).toFixed(1)}f, massa=${v.unitySpec.massKg}f, extras="${extras}" }`;
    })
    .join(',\n');

  return `using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_EDITOR
using UnityEditor;
#endif

/// <summary>
/// FÁBRICA OTIMIZADA DOS ${vehicles.length} VEÍCULOS CONCEITO (VHC-01 a VHC-${vehicles.length})
/// Com classificação por classe Unity, portas articuladas (tecla G), cache compartilhado e batching estático de malhas.
/// </summary>
public class Fabrica50Veiculos : MonoBehaviour
{
    [System.Serializable]
    public struct DefVeiculo
    {
        public string codigo, nome, categoria, classeUnity, rank, descricao, arquetipo;
        public TipoFisicaVeiculo50 tipo;
        public float comp, larg, alt, eixos, raioRoda, largRoda, vao, capCabin, altCabin;
        public string corPrim, corSec, corDest;
        public float velMax, acel, massa;
        public string extras;
    }

    private static Shader shaderBase;
    private static readonly Dictionary<long, Material> cacheMateriais = new Dictionary<long, Material>();
    private static Material matEmissivoCompartilhado;
    private static Material matChamaCompartilhado;
#if UNITY_6000_0_OR_NEWER
    private static PhysicsMaterial matFisicaSemAtrito;
#else
    private static PhysicMaterial matFisicaSemAtrito;
#endif

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetarCache()
    {
        cacheMateriais.Clear();
        matEmissivoCompartilhado = null;
        matChamaCompartilhado = null;
        shaderBase = null;
        matFisicaSemAtrito = null;
    }

    public static readonly DefVeiculo[] CATALOGO = new DefVeiculo[]
    {
${rows}
    };

#if UNITY_EDITOR
    [MenuItem("Cidade/Veículos/Gerar Frota Completa em Grade (${vehicles.length} Modelos)")]
    private static void MenuGerarTodos()
    {
        GameObject pai = new GameObject("Frota_${vehicles.length}_Veiculos_Conceito");
        for (int i = 0; i < CATALOGO.Length; i++)
        {
            int col = i % 10;
            int lin = i / 10;
            Vector3 pos = new Vector3(col * 9.5f, 0f, -lin * 15f);
            GameObject v = CriarVeiculo(i, pos, Quaternion.identity);
            v.transform.SetParent(pai.transform, true);
        }
    }
#endif

    public static GameObject CriarVeiculo(int indice, Vector3 posicao, Quaternion rotacao)
    {
        DefVeiculo d = CATALOGO[Mathf.Clamp(indice, 0, CATALOGO.Length - 1)];
        GameObject raiz = new GameObject(d.codigo + "_" + d.nome.Replace(" ", "_"));
        raiz.transform.SetPositionAndRotation(posicao, rotacao);

        Rigidbody rb = raiz.AddComponent<Rigidbody>();
        rb.mass = d.massa;

        BoxCollider col = raiz.AddComponent<BoxCollider>();
        bool ehTerrestre = d.tipo == TipoFisicaVeiculo50.Carro || d.tipo == TipoFisicaVeiculo50.Moto;
        float folgaChassi = ehTerrestre ? Mathf.Max(0.28f, d.raioRoda * 0.86f) : 0.06f;
        float altCol = Mathf.Max(0.62f, d.alt - folgaChassi * 0.80f);
        float fatorComp = d.comp >= 7.5f ? 0.84f : 0.86f;
        float fatorLarg = d.comp >= 7.5f ? 0.84f : 0.88f;
        col.size = new Vector3(d.larg * fatorLarg, altCol, d.comp * fatorComp);
        col.center = new Vector3(0f, folgaChassi + altCol * 0.5f, 0f);
        col.sharedMaterial = PegarMaterialSemAtrito();

        ControleVeiculo50 ctrl = raiz.AddComponent<ControleVeiculo50>();
        ctrl.codigo = d.codigo;
        ctrl.nomeModelo = d.nome;
        ctrl.classeUnity = d.classeUnity;
        ctrl.rankDesempenho = d.rank;
        ctrl.tipoFisica = d.tipo;
        ctrl.velocidadeMaxKmh = d.velMax;
        ctrl.aceleracao = d.acel;
        ctrl.velocidadeGiro = d.tipo == TipoFisicaVeiculo50.Moto ? 132f : (d.comp >= 7.5f ? 76f : 118f);
        ctrl.aderenciaLateral = d.arquetipo == "supercar" ? 13.5f : (d.arquetipo == "muscle" ? 8.5f : 10.8f);
        ctrl.inclinacaoCurva = d.tipo == TipoFisicaVeiculo50.Moto ? 26f : 0f;
        ctrl.comprimento = d.comp;
        ctrl.largura = d.larg;
        ctrl.altura = d.alt;
        ctrl.distanciaEixos = d.eixos > 0.2f ? d.eixos : d.comp * 0.62f;
        ctrl.raioRoda = d.raioRoda > 0.05f ? d.raioRoda : 0.34f;
        ctrl.vaoSolo = d.vao > 0.04f ? d.vao : 0.16f;
        ctrl.zEixoDianteiro = d.arquetipo == "articulated_bus" ? d.comp * 0.38f : ctrl.distanciaEixos * 0.5f;
        ctrl.zEixoTraseiro = d.arquetipo == "articulated_bus" ? -d.comp * 0.36f : -ctrl.distanciaEixos * 0.5f;
        ctrl.ehQuadriciclo = d.arquetipo == "atv";
        ctrl.ehBicicleta = d.arquetipo == "bicycle" || d.categoria == "Bicicletas";
        if (ctrl.ehBicicleta)
        {
            ctrl.inclinacaoCurva = 16f;
            ctrl.velocidadeGiro = 124f;
        }
        ctrl.meioComprimento = d.comp * 0.5f;
        ctrl.ehVeiculoLongo = d.comp >= 7.5f;
        ctrl.AplicarConfigFisica();

        InteragirVeiculo50 inter = raiz.AddComponent<InteragirVeiculo50>();
        inter.offsetSaida = new Vector3(-(d.larg * 0.5f + 1.15f), 0.6f, 0f);
        inter.veiculoAbertoSemTeto = (d.tipo == TipoFisicaVeiculo50.Moto || d.arquetipo == "roadster" || d.arquetipo == "convertible" || d.arquetipo == "formula" || d.arquetipo == "buggy" || d.arquetipo == "jetski");
        inter.assentoVisivelLocal = d.tipo == TipoFisicaVeiculo50.Moto
            ? new Vector3(0f, d.vao + (ctrl.ehBicicleta ? 0.64f : 0.52f), -0.18f)
            : new Vector3(0f, d.vao + 0.45f, -0.10f);

        Color cPrim = Hex(d.corPrim);
        Color cSec = Hex(d.corSec);
        Color cDest = Hex(d.corDest);
        Color cVidro = new Color(0.55f, 0.78f, 0.94f, 0.42f);
        Color cPneu = new Color(0.10f, 0.10f, 0.11f);
        Color cAro = new Color(0.78f, 0.80f, 0.84f);
        Color cCromo = new Color(0.92f, 0.92f, 0.94f);

        if (d.tipo == TipoFisicaVeiculo50.Aviao)
            MontarAviaoOuJato(raiz.transform, d, ctrl, cPrim, cSec, cDest, cVidro, cPneu, cAro);
        else if (d.tipo == TipoFisicaVeiculo50.Helicoptero)
            MontarHelicoptero(raiz.transform, d, ctrl, cPrim, cSec, cDest, cVidro, cPneu, cAro);
        else if (d.tipo == TipoFisicaVeiculo50.Hovercraft)
            MontarHovercraft(raiz.transform, d, ctrl, cPrim, cSec, cDest, cVidro);
        else if (d.tipo == TipoFisicaVeiculo50.Barco)
            MontarBarco(raiz.transform, d, ctrl, cPrim, cSec, cDest, cVidro);
        else if (d.arquetipo == "bicycle")
            MontarBicicleta(raiz.transform, d, ctrl, cPrim, cSec, cDest, cPneu, cAro, cCromo);
        else if (d.tipo == TipoFisicaVeiculo50.Moto)
            MontarMotoOuAtv(raiz.transform, d, ctrl, cPrim, cSec, cDest, cPneu, cAro, cCromo);
        else
            MontarVeiculoTerrestre(raiz.transform, d, ctrl, cPrim, cSec, cDest, cVidro, cPneu, cAro, cCromo);

        Transform grupoChassi = OrganizarGruposPadronizados(raiz.transform, ctrl);
        CombinarMalhasEstaticas(grupoChassi, ctrl);
        return raiz;
    }

    private static void MontarVeiculoTerrestre(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cVidro, Color cPneu, Color cAro, Color cCromo)
    {
        float hl = d.comp * 0.5f;
        bool ehCaminhao = d.arquetipo == "semi_truck" || d.arquetipo == "dump_truck" || d.arquetipo == "mixer_truck" || d.arquetipo == "firetruck" || d.arquetipo == "tow_truck";
        bool ehFurgao = d.arquetipo == "van" || d.arquetipo == "ambulance" || d.arquetipo == "armored";
        bool ehOnibus = d.arquetipo == "bus" || d.arquetipo == "articulated_bus";
        bool ehPicape = d.arquetipo == "pickup" || d.arquetipo == "monster";
        bool ehSuper = d.arquetipo == "supercar";

        // Regra GDD: Altura mínima do topo da carroceria garante clearance sobre o pneu (evita roda varando o capô)
        float alturaMinPneu = (d.raioRoda > 0.05f && !ehOnibus) ? Mathf.Max(0.42f, (d.raioRoda * 2f + 0.042f) - d.vao) : 0.42f;
        float corpoH = ehOnibus
            ? (d.alt - d.vao) * 0.42f
            : (ehFurgao ? (d.alt - d.vao) * 0.46f : Mathf.Max(alturaMinPneu, (d.alt - d.vao) * (1f - d.altCabin)));
        float beltY = d.vao + corpoH;
        float cabH = Mathf.Max(0.32f, d.alt - beltY);
        float cabL = d.comp * d.capCabin;
        float xPortaFlush = d.larg * 0.495f - 0.028f;

        if (ehOnibus)
        {
            bool ehEscolar = d.extras.Contains("school_sign");
            float hoodLen = ehEscolar ? Mathf.Min(1.45f, d.comp * 0.20f) : 0f;
            float bodyLen = d.comp - hoodLen;
            float bodyCenterZ = -hoodLen * 0.5f;

            if (ehEscolar)
            {
                Transform capoEsc = CriarPivoArticulado(raiz, "Capo_Escolar", new Vector3(0f, beltY - 0.04f, hl - hoodLen), new Vector3(-38f, 0f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Capo_Motor", capoEsc, new Vector3(0f, -0.08f, hoodLen * 0.48f), new Vector3(d.larg * 0.80f, corpoH * 0.65f, hoodLen * 0.94f), cPrim, 0.72f);
                Transform stopArm = CriarPivoArticulado(raiz, "Placa_PARE_Escolar", new Vector3(-d.larg * 0.51f, beltY - 0.12f, hl - hoodLen - 0.35f), new Vector3(0f, 82f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cylinder, "Disco_PARE", stopArm, new Vector3(-0.02f, 0f, -0.22f), new Vector3(0.40f, 0.03f, 0.40f), Color.red, 0.4f);
            }

            if (d.arquetipo == "articulated_bus")
            {
                float fL = d.comp * 0.54f;
                float rL = d.comp * 0.36f;
                float fZ = hl - fL * 0.5f;
                float rZ = -hl + rL * 0.5f;
                float bZ = ((fZ - fL * 0.5f) + (rZ + rL * 0.5f)) * 0.5f;
                Peca(PrimitiveType.Cube, "Base_Frente_BRT", raiz, new Vector3(0f, d.vao + corpoH * 0.5f, fZ), new Vector3(d.larg, corpoH, fL), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, "Teto_Frente_BRT", raiz, new Vector3(0f, d.alt - 0.08f, fZ), new Vector3(d.larg * 0.96f, 0.16f, fL), cSec, 0.72f);
                Peca(PrimitiveType.Cube, "Base_Tras_BRT", raiz, new Vector3(0f, d.vao + corpoH * 0.5f, rZ), new Vector3(d.larg, corpoH, rL), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, "Teto_Tras_BRT", raiz, new Vector3(0f, d.alt - 0.08f, rZ), new Vector3(d.larg * 0.96f, 0.16f, rL), cSec, 0.72f);
                for (int sRib = -4; sRib <= 4; sRib++)
                    Peca(PrimitiveType.Cube, "Sanfona_Dobra_" + (sRib + 5), raiz, new Vector3(0f, d.vao + (d.alt - d.vao) * 0.5f, bZ + sRib * (d.comp * 0.01f)), new Vector3(d.larg * (sRib % 2 == 0 ? 0.94f : 0.89f), d.alt - d.vao - 0.14f, 0.08f), new Color(0.14f, 0.15f, 0.17f), 0.22f);
                for (int s = -1; s <= 1; s += 2)
                {
                    Peca(PrimitiveType.Cube, "Janela_Frente_BRT", raiz, new Vector3(s * d.larg * 0.47f, beltY + cabH * 0.46f, fZ), new Vector3(0.05f, cabH * 0.76f, fL * 0.92f), cVidro, 0.92f);
                    Peca(PrimitiveType.Cube, "Janela_Tras_BRT", raiz, new Vector3(s * d.larg * 0.47f, beltY + cabH * 0.46f, rZ), new Vector3(0.05f, cabH * 0.76f, rL * 0.90f), cVidro, 0.92f);
                }
                for (int b = -4; b <= 4; b++)
                    Peca(PrimitiveType.Cube, "Coluna_BRT_" + b, raiz, new Vector3(0f, beltY + cabH * 0.46f, b * (d.comp * 0.095f)), new Vector3(d.larg * 0.97f, cabH * 0.88f, 0.08f), cSec, 0.4f);
            }
            else
            {
                Peca(PrimitiveType.Cube, "Base_Onibus", raiz, new Vector3(0f, d.vao + corpoH * 0.5f, bodyCenterZ), new Vector3(d.larg, corpoH, bodyLen * 0.98f), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, "Teto_Onibus", raiz, new Vector3(0f, d.alt - 0.08f, bodyCenterZ), new Vector3(d.larg * 0.96f, 0.16f, bodyLen * 0.98f), cSec, 0.72f);
                Peca(PrimitiveType.Cube, "Faixa_Onibus", raiz, new Vector3(0f, beltY - 0.12f, bodyCenterZ), new Vector3(d.larg * 1.01f, 0.16f, bodyLen * 0.97f), cSec, 0.5f);
                for (int s = -1; s <= 1; s += 2)
                    Peca(PrimitiveType.Cube, s < 0 ? "Janela_Onibus_E" : "Janela_Onibus_D", raiz, new Vector3(s * d.larg * 0.47f, beltY + cabH * 0.46f, bodyCenterZ), new Vector3(0.05f, cabH * 0.76f, bodyLen * 0.92f), cVidro, 0.92f);
                int nCols = Mathf.Max(4, Mathf.RoundToInt(bodyLen / 1.45f));
                for (int c = 0; c <= nCols; c++)
                {
                    float cz = (bodyCenterZ - bodyLen * 0.46f) + (c / (float)nCols) * (bodyLen * 0.92f);
                    Peca(PrimitiveType.Cube, "Coluna_Janela_" + c, raiz, new Vector3(0f, beltY + cabH * 0.46f, cz), new Vector3(d.larg * 0.97f, cabH * 0.88f, 0.08f), cSec, 0.4f);
                }
            }

            // Máscara frontal fechada: parabrisa embutido entre colunas A, testeira superior e limpadores (zero vão)
            float zFrenteMask = hl - hoodLen - 0.04f;
            Peca(PrimitiveType.Cube, "Parabrisa_Panoramico", raiz, new Vector3(0f, beltY + cabH * 0.44f, zFrenteMask), new Vector3(d.larg * 0.88f, cabH * 0.74f, 0.06f), cVidro, 0.94f);
            Peca(PrimitiveType.Cube, "Testeira_Superior_Onibus", raiz, new Vector3(0f, d.alt - 0.16f, zFrenteMask + 0.02f), new Vector3(d.larg * 0.98f, 0.18f, 0.14f), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Moldura_Cowl_Onibus", raiz, new Vector3(0f, beltY + 0.04f, zFrenteMask + 0.03f), new Vector3(d.larg * 0.98f, 0.10f, 0.12f), new Color(0.14f, 0.15f, 0.18f), 0.3f);
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_A_Onibus_E" : "Coluna_A_Onibus_D", raiz, new Vector3(s * d.larg * 0.46f, beltY + cabH * 0.44f, zFrenteMask + 0.02f), new Vector3(0.10f, cabH * 0.88f, 0.12f), cSec, 0.45f);
            Transform letreiro = PecaEmissiva(PrimitiveType.Cube, "Letreiro_Digital", raiz, new Vector3(0f, d.alt - 0.14f, zFrenteMask + 0.07f), new Vector3(d.larg * 0.68f, 0.15f, 0.05f));
            ctrl.giroflexAmbar.Add(letreiro.GetComponent<Renderer>());

            // Molduras de caixa de roda e tampa traseira do motor
            Peca(PrimitiveType.Cube, "Grade_Motor_Traseira", raiz, new Vector3(0f, d.vao + corpoH * 0.45f, -hl + 0.03f), new Vector3(d.larg * 0.66f, corpoH * 0.56f, 0.05f), new Color(0.12f, 0.13f, 0.15f), 0.35f);

            // Portas de embarque alinhadas à face direita (+X)
            for (int dp = 0; dp < 2; dp++)
            {
                float zPorta = dp == 0 ? (hl - hoodLen - 1.15f) : (bodyCenterZ - 0.6f);
                Transform pivoEmbarque = CriarPivoArticulado(raiz, "Porta_Embarque_" + (dp + 1), new Vector3(xPortaFlush, beltY, zPorta), new Vector3(0f, -78f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Folha_Porta_Onibus", pivoEmbarque, new Vector3(0f, -corpoH * 0.08f, -0.45f), new Vector3(0.055f, d.alt * 0.66f, 0.90f), cVidro, 0.85f);
                Peca(PrimitiveType.Cube, "Selo_Central_Porta", pivoEmbarque, new Vector3(0.01f, -corpoH * 0.08f, -0.45f), new Vector3(0.06f, d.alt * 0.66f, 0.05f), new Color(0.1f, 0.1f, 0.12f), 0.25f);
            }
        }
        else if (ehCaminhao)
        {
            float cabZ = hl - cabL * 0.5f - 0.12f;
            float frameY = d.vao + 0.16f;
            float cabBaseY = frameY + 0.12f;
            float cabAlt = d.alt - cabBaseY - (d.arquetipo == "semi_truck" ? 0.22f : 0.10f);
            float noseL = d.arquetipo == "semi_truck" ? cabL * 0.34f : cabL * 0.16f;
            float cabBodyL = cabL - noseL * 0.4f;
            float cabCenterZ = cabZ - noseL * 0.2f;

            // Chassi em longarinas + eixo cardã e diferencial traseiro
            Peca(PrimitiveType.Cube, "Chassi_Longarinas", raiz, new Vector3(0f, frameY, 0f), new Vector3(d.larg * 0.58f, 0.22f, d.comp * 0.94f), new Color(0.11f, 0.12f, 0.14f), 0.35f);
            Peca(PrimitiveType.Cylinder, "Eixo_Carda", raiz, new Vector3(0f, d.raioRoda * 0.92f, 0f), new Vector3(0.11f, d.eixos * 0.44f, 0.11f), new Color(0.18f, 0.19f, 0.21f), 0.55f)
                .localRotation = Quaternion.Euler(90f, 0f, 0f);
            Peca(PrimitiveType.Sphere, "Diferencial_Traseiro", raiz, new Vector3(0f, d.raioRoda * 0.94f, -d.eixos * 0.5f), new Vector3(0.36f, 0.34f, 0.36f), new Color(0.12f, 0.13f, 0.15f), 0.4f);

            // Núcleo recuado da cabine com vão real para parabrisa (zero caixa sólida tapando o vidro!)
            float cabFrontZ = cabCenterZ + cabBodyL * 0.5f;
            float hoodTopY = cabBaseY + cabAlt * 0.44f;
            float wsBotZ = cabFrontZ - 0.04f;
            float wsTopZ = wsBotZ - 0.24f;
            float backCabL = Mathf.Max(0.36f, cabBodyL - (cabFrontZ - wsTopZ));
            float backCabZ = (cabCenterZ - cabBodyL * 0.5f) + backCabL * 0.5f;

            Peca(PrimitiveType.Cube, "Cabine_Capo_Inferior", raiz, new Vector3(0f, cabBaseY + (hoodTopY - cabBaseY) * 0.5f, cabCenterZ), new Vector3(d.larg * 0.84f, hoodTopY - cabBaseY, cabBodyL), cPrim, 0.74f);
            Peca(PrimitiveType.Cube, "Cabine_Parede_Traseira", raiz, new Vector3(0f, hoodTopY + (cabAlt * 0.56f) * 0.5f, backCabZ), new Vector3(d.larg * 0.84f, cabAlt * 0.56f, backCabL), cPrim, 0.74f);
            Peca(PrimitiveType.Cube, "Testeira_Parabrisa_Cam", raiz, new Vector3(0f, cabBaseY + cabAlt - 0.07f, wsTopZ + 0.04f), new Vector3(d.larg * 0.88f, 0.14f, 0.22f), cPrim, 0.74f);
            Peca(PrimitiveType.Cube, "Painel_Cabine_Cam", raiz, new Vector3(0f, hoodTopY + 0.08f, wsBotZ - 0.18f), new Vector3(d.larg * 0.74f, 0.20f, 0.30f), new Color(0.14f, 0.15f, 0.17f), 0.35f);
            Peca(PrimitiveType.Cube, "Soleira_Cabine", raiz, new Vector3(0f, cabBaseY + 0.08f, cabCenterZ), new Vector3(d.larg * 0.95f, 0.14f, cabBodyL * 0.98f), new Color(0.14f, 0.15f, 0.17f), 0.35f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_Frente_E" : "Paralama_Frente_D", raiz, new Vector3(s * d.larg * 0.46f, cabBaseY + cabAlt * 0.22f, cabFrontZ - (noseL + 0.18f) * 0.5f), new Vector3(d.larg * 0.08f, cabAlt * 0.44f, noseL + 0.18f), cPrim, 0.74f);
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_A_Cam_E" : "Coluna_A_Cam_D", raiz, new Vector3(s * d.larg * 0.43f, hoodTopY + cabAlt * 0.27f, (wsBotZ + wsTopZ) * 0.5f), new Vector3(0.09f, cabAlt * 0.54f, 0.10f), cPrim, 0.74f)
                    .localRotation = Quaternion.Euler(-16f, 0f, 0f);
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_Traseira_Cab_E" : "Coluna_Traseira_Cab_D", raiz, new Vector3(s * d.larg * 0.46f, cabBaseY + cabAlt * 0.5f, cabCenterZ - cabBodyL * 0.36f), new Vector3(d.larg * 0.08f, cabAlt * 0.96f, cabBodyL * 0.28f), cPrim, 0.74f);
                Peca(PrimitiveType.Cube, s < 0 ? "Teto_Cabine_Lado_E" : "Teto_Cabine_Lado_D", raiz, new Vector3(s * d.larg * 0.46f, cabBaseY + cabAlt * 0.92f, cabCenterZ), new Vector3(d.larg * 0.08f, cabAlt * 0.16f, cabBodyL), cPrim, 0.74f);
                Peca(PrimitiveType.Cube, s < 0 ? "Banco_Cam_E" : "Banco_Cam_D", raiz, new Vector3(s * d.larg * 0.22f, hoodTopY + 0.18f, wsTopZ - 0.18f), new Vector3(0.38f, 0.42f, 0.36f), new Color(0.16f, 0.17f, 0.20f), 0.25f);
                // Escada de 2 degraus + guarda-lamas traseiros
                Peca(PrimitiveType.Cube, s < 0 ? "Degrau_Cab_E" : "Degrau_Cab_D", raiz, new Vector3(s * d.larg * 0.49f, frameY - 0.02f, cabZ + cabL * 0.02f), new Vector3(0.14f, 0.06f, 0.52f), cCromo, 0.85f);
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_Tras_E" : "Paralama_Tras_D", raiz, new Vector3(s * d.larg * 0.46f, d.raioRoda * 2.02f, -d.eixos * 0.5f), new Vector3(d.largRoda * 1.4f, 0.07f, d.raioRoda * 2.4f), new Color(0.12f, 0.13f, 0.15f), 0.3f);
            }

            Transform wsCam = Peca(PrimitiveType.Cube, "Parabrisa_Caminhao", raiz, new Vector3(0f, hoodTopY + cabAlt * 0.26f, (wsBotZ + wsTopZ) * 0.5f + 0.02f), new Vector3(d.larg * 0.80f, cabAlt * 0.48f, 0.05f), cVidro, 0.94f);
            wsCam.localRotation = Quaternion.Euler(-16f, 0f, 0f);
            Peca(PrimitiveType.Cube, "QuebraSol_Cabine", raiz, new Vector3(0f, cabBaseY + cabAlt * 0.93f, wsTopZ + 0.10f), new Vector3(d.larg * 0.86f, 0.08f, 0.20f), cCromo, 0.88f);

            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cylinder, s < 0 ? "Tanque_Diesel_E" : "Tanque_Diesel_D", raiz, new Vector3(s * d.larg * 0.39f, frameY + 0.08f, cabZ - cabL * 0.72f), new Vector3(0.46f, d.comp * 0.10f, 0.46f), cCromo, 0.88f)
                    .localRotation = Quaternion.Euler(90f, 0f, 0f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Chamine_E" : "Chamine_D", raiz, new Vector3(s * d.larg * 0.46f, cabBaseY + cabAlt * 0.62f, cabZ - cabL * 0.46f), new Vector3(0.13f, cabAlt * 0.48f, 0.13f), cCromo, 0.90f);
            }

            float rearL = d.comp - cabL - 0.35f;
            float rearZ = -hl + rearL * 0.5f + 0.10f;

            if (d.arquetipo == "semi_truck")
            {
                Peca(PrimitiveType.Cube, "Defletor_Aero_Teto", raiz, new Vector3(0f, cabBaseY + cabAlt + 0.22f, cabZ - cabL * 0.16f), new Vector3(d.larg * 0.88f, 0.44f, cabL * 0.56f), cPrim, 0.76f);
                Peca(PrimitiveType.Cylinder, "Quinta_Roda", raiz, new Vector3(0f, frameY + 0.18f, rearZ), new Vector3(0.88f, 0.06f, 0.88f), Color.black, 0.4f);
                Peca(PrimitiveType.Cube, "Passarela_Chassi", raiz, new Vector3(0f, frameY + 0.14f, rearZ + rearL * 0.35f), new Vector3(d.larg * 0.62f, 0.05f, 0.65f), cCromo, 0.75f);
                Transform capoCam = CriarPivoArticulado(raiz, "Capo_Caminhao", new Vector3(0f, hoodTopY, cabFrontZ), new Vector3(-38f, 0f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Capo_Motor_Diesel", capoCam, new Vector3(0f, -0.14f, noseL * 0.44f), new Vector3(d.larg * 0.82f, cabAlt * 0.42f, noseL * 0.90f), cPrim, 0.75f);
            }
            else if (d.arquetipo == "dump_truck")
            {
                Peca(PrimitiveType.Cylinder, "Pistao_Hidraulico_Cacamba", raiz, new Vector3(0f, frameY + 0.55f, rearZ + rearL * 0.36f), new Vector3(0.18f, 0.52f, 0.18f), cCromo, 0.90f)
                    .localRotation = Quaternion.Euler(22f, 0f, 0f);
                Transform pivoCacamba = CriarPivoArticulado(raiz, "Cacamba_Basculante_Pivo", new Vector3(0f, frameY + 0.24f, -hl + 0.45f), new Vector3(-26f, 0f, 0f), Vector3.zero, ctrl);
                float cH = cabAlt * 0.64f;
                Peca(PrimitiveType.Cube, "Assoalho_Cacamba", pivoCacamba, new Vector3(0f, 0.06f, rearL * 0.5f - 0.35f), new Vector3(d.larg * 0.96f, 0.12f, rearL), cSec, 0.4f);
                Peca(PrimitiveType.Cube, "Parede_Frontal_Cacamba", pivoCacamba, new Vector3(0f, cH * 0.5f, rearL - 0.40f), new Vector3(d.larg * 0.96f, cH, 0.12f), cSec, 0.4f);
                Peca(PrimitiveType.Cube, "Pala_Protetora_Cabine", pivoCacamba, new Vector3(0f, cH + 0.06f, rearL - 0.08f), new Vector3(d.larg * 0.96f, 0.10f, cabL * 0.52f), cSec, 0.45f);
                for (int s = -1; s <= 1; s += 2)
                {
                    Peca(PrimitiveType.Cube, s < 0 ? "Lateral_Cacamba_E" : "Lateral_Cacamba_D", pivoCacamba, new Vector3(s * d.larg * 0.45f, cH * 0.5f, rearL * 0.5f - 0.35f), new Vector3(0.10f, cH, rearL), cSec, 0.4f);
                    Peca(PrimitiveType.Cube, "Dobradica_Tampa_" + (s < 0 ? "E" : "D"), pivoCacamba, new Vector3(s * d.larg * 0.40f, cH * 0.92f, -0.30f), new Vector3(0.10f, 0.16f, 0.14f), cDest, 0.5f);
                }
                Peca(PrimitiveType.Cube, "Tampa_Cacamba", pivoCacamba, new Vector3(0f, cH * 0.48f, -0.32f), new Vector3(d.larg * 0.90f, cH * 0.90f, 0.09f), cDest, 0.4f);
            }
            else if (d.arquetipo == "mixer_truck")
            {
                Peca(PrimitiveType.Cube, "Mancal_Dianteiro", raiz, new Vector3(0f, frameY + 0.56f, rearZ + rearL * 0.42f), new Vector3(d.larg * 0.44f, 1.02f, 0.36f), Color.black, 0.4f);
                Peca(PrimitiveType.Cube, "Mancal_Traseiro", raiz, new Vector3(0f, frameY + 0.62f, rearZ - rearL * 0.38f), new Vector3(d.larg * 0.72f, 1.12f, 0.28f), Color.black, 0.4f);
                Peca(PrimitiveType.Cube, "Funil_Concreto", raiz, new Vector3(0f, frameY + 1.24f, -hl + 0.24f), new Vector3(0.76f, 0.44f, 0.56f), cDest, 0.5f);
                Peca(PrimitiveType.Cube, "Escada_Traseira_Betoneira", raiz, new Vector3(d.larg * 0.36f, frameY + 0.85f, -hl + 0.26f), new Vector3(0.28f, 1.45f, 0.06f), cCromo, 0.78f);
                Transform calhaPivo = CriarPivoArticulado(raiz, "Calha_Giratoria_Concreto", new Vector3(0f, frameY + 0.84f, -hl + 0.12f), new Vector3(0f, 52f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Calha_Descarga", calhaPivo, new Vector3(0f, -0.18f, -0.48f), new Vector3(0.32f, 0.14f, 1.05f), Color.black, 0.4f).localRotation = Quaternion.Euler(24f, 0f, 0f);
            }
            else if (d.arquetipo == "firetruck")
            {
                Peca(PrimitiveType.Cube, "Modulo_Bombas", raiz, new Vector3(0f, frameY + 0.12f + cabAlt * 0.37f, rearZ), new Vector3(d.larg * 0.96f, cabAlt * 0.74f, rearL), cPrim, 0.65f);
                Peca(PrimitiveType.Cube, "Painel_Manometros_Bombas", raiz, new Vector3(-d.larg * 0.49f, frameY + 0.12f + cabAlt * 0.37f, rearZ + rearL * 0.26f), new Vector3(0.06f, cabAlt * 0.36f, 0.72f), cCromo, 0.85f);
                for (int s = -1; s <= 1; s += 2)
                {
                    Transform persiana = CriarPivoArticulado(raiz, s < 0 ? "Persiana_E" : "Persiana_D", new Vector3(s * d.larg * 0.495f, frameY + 0.12f + cabAlt * 0.37f, rearZ), Vector3.zero, new Vector3(0f, cabAlt * 0.38f, 0f), ctrl);
                    Peca(PrimitiveType.Cube, "Folha_Persiana", persiana, new Vector3.zero, new Vector3(0.05f, cabAlt * 0.48f, rearL * 0.78f), cAro, 0.75f);
                }
                Transform escPivo = CriarPivoArticulado(raiz, "Escada_Magirus_Pivo", new Vector3(0f, frameY + 0.18f + cabAlt * 0.76f, rearZ), new Vector3(-22f, 24f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Escada_Magirus", escPivo, new Vector3(0f, 0.18f, d.comp * 0.16f), new Vector3(0.56f, 0.18f, d.comp * 0.64f), cAro, 0.78f);
            }
            else if (d.arquetipo == "tow_truck")
            {
                Peca(PrimitiveType.Cube, "Torre_Guincho", raiz, new Vector3(0f, frameY + 0.56f, rearZ + rearL * 0.44f), new Vector3(d.larg * 0.86f, 0.96f, 0.24f), cDest, 0.55f);
                Transform platPivo = CriarPivoArticulado(raiz, "Plataforma_Rollback_Pivo", new Vector3(0f, frameY + 0.20f, -hl + 0.82f), new Vector3(-15f, 0f, 0f), new Vector3(0f, 0.12f, -0.60f), ctrl);
                Peca(PrimitiveType.Cube, "Plataforma_Aco", platPivo, new Vector3(0f, 0.08f, rearL * 0.5f - 0.72f), new Vector3(d.larg * 0.96f, 0.14f, rearL), cSec, 0.45f);
            }
        }
        else if (ehFurgao)
        {
            float cabZ = hl - d.comp * 0.22f;
            float cargoL = d.comp * 0.58f;
            float cargoZ = -hl + cargoL * 0.5f + 0.04f;
            float cabShellH = (d.alt - d.vao) * 0.88f;
            float cabShellY = d.vao + (d.alt - d.vao) * 0.46f;
            float wsTopZ = hl - d.comp * 0.16f;
            float wsBotZ = hl - 0.24f;
            float capTetoL = Mathf.Max(0.28f, wsTopZ - (cargoZ + cargoL * 0.5f));

            // Cabine dianteira dividida: capô inferior inclinado + teto traseiro + painel + parabrisa vazado (zero orelha quadrada!)
            Peca(PrimitiveType.Cube, "Cabine_Inferior_Furgao", raiz, new Vector3(0f, d.vao + corpoH * 0.46f, cabZ), new Vector3(d.larg * 0.84f, corpoH * 0.92f, d.comp * 0.35f), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Capo_Inclinado_Furgao", raiz, new Vector3(0f, beltY - 0.08f, hl - d.comp * 0.08f), new Vector3(d.larg * 0.90f, 0.16f, d.comp * 0.16f), cPrim, 0.72f)
                .localRotation = Quaternion.Euler(14f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Teto_Cabine_Furgao", raiz, new Vector3(0f, d.alt - 0.09f, (cargoZ + cargoL * 0.5f) + capTetoL * 0.5f), new Vector3(d.larg * 0.88f, 0.16f, capTetoL), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Testeira_Frontal_Furgao", raiz, new Vector3(0f, d.alt - 0.11f, wsTopZ), new Vector3(d.larg * 0.86f, 0.12f, 0.14f), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Painel_Furgao", raiz, new Vector3(0f, beltY + 0.04f, wsBotZ - 0.18f), new Vector3(d.larg * 0.76f, 0.20f, 0.28f), new Color(0.14f, 0.15f, 0.17f), 0.35f);
            Peca(PrimitiveType.Cube, "Soleira_Furgao", raiz, new Vector3(0f, d.vao + 0.12f, cabZ), new Vector3(d.larg * 0.96f, 0.16f, d.comp * 0.38f), new Color(0.14f, 0.15f, 0.17f), 0.35f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_Sloped_E" : "Paralama_Sloped_D", raiz, new Vector3(s * d.larg * 0.45f, d.vao + corpoH * 0.44f, hl - d.comp * 0.09f), new Vector3(d.larg * 0.08f, corpoH * 0.82f, d.comp * 0.17f), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_A_Furgao_E" : "Coluna_A_Furgao_D", raiz, new Vector3(s * d.larg * 0.43f, beltY + cabH * 0.44f, (wsBotZ + wsTopZ) * 0.5f), new Vector3(0.08f, cabH * 0.84f, 0.10f), cPrim, 0.72f)
                    .localRotation = Quaternion.Euler(-16f, 0f, 0f);
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_B_Furgao_E" : "Coluna_B_Furgao_D", raiz, new Vector3(s * d.larg * 0.46f, cabShellY, cargoZ + cargoL * 0.5f + 0.08f), new Vector3(d.larg * 0.08f, cabShellH, 0.18f), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, s < 0 ? "Banco_Furgao_E" : "Banco_Furgao_D", raiz, new Vector3(s * d.larg * 0.22f, beltY + 0.14f, wsTopZ - 0.16f), new Vector3(0.38f, 0.40f, 0.34f), new Color(0.16f, 0.17f, 0.20f), 0.25f);
            }
            Peca(PrimitiveType.Cube, "Parabrisa_Furgao", raiz, new Vector3(0f, beltY + cabH * 0.44f, (wsBotZ + wsTopZ) * 0.5f + 0.02f), new Vector3(d.larg * 0.82f, cabH * (d.arquetipo == "armored" ? 0.46f : 0.78f), 0.05f), cVidro, 0.94f)
                .localRotation = Quaternion.Euler(-16f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Assoalho_Bau", raiz, new Vector3(0f, d.vao + 0.12f, cargoZ), new Vector3(d.larg * 0.96f, 0.12f, cargoL), Color.black, 0.3f);
            Peca(PrimitiveType.Cube, "Teto_Bau", raiz, new Vector3(0f, d.alt - 0.06f, cargoZ), new Vector3(d.larg * 0.98f, 0.12f, cargoL), cPrim, 0.72f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Parede_Bau_E" : "Parede_Bau_D", raiz, new Vector3(s * d.larg * 0.46f, d.vao + (d.alt - d.vao) * 0.5f, cargoZ), new Vector3(0.10f, d.alt - d.vao - 0.12f, cargoL), cPrim, 0.70f);
                Peca(PrimitiveType.Cube, s < 0 ? "Friso_Carga_E" : "Friso_Carga_D", raiz, new Vector3(s * d.larg * 0.495f, d.vao + (d.alt - d.vao) * 0.44f, cargoZ), new Vector3(0.03f, 0.10f, cargoL * 0.90f), cSec, 0.5f);
                Transform ptTraseira = CriarPivoArticulado(raiz, s < 0 ? "Porta_Traseira_E" : "Porta_Traseira_D", new Vector3(s * d.larg * 0.44f, d.vao + (d.alt - d.vao) * 0.5f, -hl), new Vector3(0f, s * -98f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Folha_Porta_Traseira", ptTraseira, new Vector3(-s * d.larg * 0.21f, 0f, 0f), new Vector3(d.larg * 0.42f, d.alt - d.vao - 0.20f, 0.06f), cPrim, 0.72f);
            }
            if (d.arquetipo == "armored")
            {
                Transform torre = CriarPivoArticulado(raiz, "Escotilha_Torre_Blindada", new Vector3(0f, d.alt + 0.14f, 0.2f), new Vector3(-62f, 0f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cylinder, "Torre_Blindada", torre, new Vector3(0f, 0f, -0.25f), new Vector3(0.86f, 0.16f, 0.86f), cSec, 0.4f);
            }
            else if (d.arquetipo == "ambulance")
            {
                // Carenagem médica alta estilo anos 80 + estrobos frontais + maca
                Peca(PrimitiveType.Cube, "Teto_Medico_SAMU", raiz, new Vector3(0f, d.alt + 0.08f, cargoZ), new Vector3(d.larg * 0.88f, 0.18f, cargoL * 0.92f), Color.white, 0.72f);
                Peca(PrimitiveType.Cube, "Maca_SAMU", raiz, new Vector3(-d.larg * 0.14f, d.vao + 0.48f, cargoZ), new Vector3(0.56f, 0.14f, cargoL * 0.68f), cDest, 0.35f);
                Transform eV = PecaEmissiva(PrimitiveType.Cube, "Estrobo_Testa_SAMU_E", raiz, new Vector3(-d.larg * 0.24f, d.alt + 0.06f, cargoZ + cargoL * 0.46f), new Vector3(0.28f, 0.09f, 0.08f));
                Transform eA = PecaEmissiva(PrimitiveType.Cube, "Estrobo_Testa_SAMU_D", raiz, new Vector3(d.larg * 0.24f, d.alt + 0.06f, cargoZ + cargoL * 0.46f), new Vector3(0.28f, 0.09f, 0.08f));
                ctrl.giroflexVermelho.Add(eV.GetComponent<Renderer>());
                ctrl.giroflexAzul.Add(eA.GetComponent<Renderer>());
            }
        }
        else if (d.arquetipo == "buggy")
        {
            // Buggy com cockpit tubular aberto e bancos concha (zero cabine fechada estilo sedan!)
            Peca(PrimitiveType.Cube, "Assoalho_Buggy", raiz, new Vector3(0f, d.vao + 0.08f, 0f), new Vector3(d.larg * 0.64f, 0.12f, d.comp * 0.82f), cSec, 0.4f);
            Peca(PrimitiveType.Cube, "Capo_Buggy", raiz, new Vector3(0f, d.vao + 0.28f, hl * 0.48f), new Vector3(d.larg * 0.56f, 0.22f, d.comp * 0.32f), cPrim, 0.74f)
                .localRotation = Quaternion.Euler(14f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Gaiola_Tubular_Superior", raiz, new Vector3(0f, d.alt - 0.05f, -0.10f), new Vector3(d.larg * 0.58f, 0.06f, d.comp * 0.42f), cSec, 0.45f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Banco_Buggy_E" : "Banco_Buggy_D", raiz, new Vector3(s * d.larg * 0.17f, d.vao + 0.32f, -0.14f), new Vector3(0.32f, 0.44f, 0.36f), cSec, 0.22f);
                Peca(PrimitiveType.Cube, s < 0 ? "Apoio_Cabeca_Buggy_E" : "Apoio_Cabeca_Buggy_D", raiz, new Vector3(s * d.larg * 0.17f, d.vao + 0.58f, -0.24f), new Vector3(0.18f, 0.14f, 0.09f), cDest, 0.25f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Pilar_Gaiola_F_E" : "Pilar_Gaiola_F_D", raiz, new Vector3(s * d.larg * 0.27f, d.vao + (d.alt - d.vao) * 0.52f, 0.32f), new Vector3(0.055f, (d.alt - d.vao) * 0.44f, 0.055f), cSec, 0.45f)
                    .localRotation = Quaternion.Euler(-24f, 0f, 0f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Pilar_Gaiola_T_E" : "Pilar_Gaiola_T_D", raiz, new Vector3(s * d.larg * 0.27f, d.vao + (d.alt - d.vao) * 0.52f, -0.46f), new Vector3(0.055f, (d.alt - d.vao) * 0.44f, 0.055f), cSec, 0.45f)
                    .localRotation = Quaternion.Euler(18f, 0f, 0f);
            }
        }
        else
        {
            // Regra GDD: Carroceria com zona das portas selada (núcleo 0.84*larg + para-lamas + coluna traseira + soleira)
            // Garante zero buraco lateral e zero porta faltando ou afundada!
            float meioComp = d.comp * 0.96f;
            float zPortaDiant = 0.48f;
            float compPortaPass = 0.96f;
            float zFimPorta = zPortaDiant - compPortaPass;
            float compFrente = Mathf.Max(0.45f, (meioComp * 0.5f) - zPortaDiant);
            float compTras = Mathf.Max(0.45f, zFimPorta - (-meioComp * 0.5f));

            Peca(PrimitiveType.Cube, "Carroceria_Nucleo", raiz,
                new Vector3(0f, d.vao + corpoH * 0.5f, 0f),
                new Vector3(d.larg * 0.84f, corpoH, meioComp), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Soleira_Inferior", raiz,
                new Vector3(0f, d.vao + 0.08f, 0f),
                new Vector3(d.larg * 0.97f, 0.14f, meioComp * 0.96f), cSec, 0.38f);

            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_F_E" : "Paralama_F_D", raiz,
                    new Vector3(s * d.larg * 0.46f, d.vao + corpoH * 0.5f, zPortaDiant + compFrente * 0.5f),
                    new Vector3(d.larg * 0.08f, corpoH * 0.96f, compFrente), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, s < 0 ? "Lateral_Traseira_E" : "Lateral_Traseira_D", raiz,
                    new Vector3(s * d.larg * 0.46f, d.vao + corpoH * 0.5f, -meioComp * 0.5f + compTras * 0.5f),
                    new Vector3(d.larg * 0.08f, corpoH * 0.96f, compTras), cPrim, 0.72f);
            }

            Peca(PrimitiveType.Cube, "Saias_Laterais", raiz,
                new Vector3(0f, d.vao + 0.06f, 0f),
                new Vector3(d.larg * 1.01f, 0.10f, Mathf.Max(0.8f, d.eixos - d.raioRoda * 1.9f)), cSec, 0.35f);

            if (d.arquetipo == "roadster" || d.arquetipo == "convertible" || d.arquetipo == "formula")
            {
                float wsCenterZ = cabL * 0.36f;
                float wsTopY = beltY + 0.30f;
                Transform pb = Peca(PrimitiveType.Cube, "Parabrisa_Aberto", raiz,
                    new Vector3(0f, beltY + 0.16f, wsCenterZ),
                    new Vector3(d.larg * 0.80f, 0.32f, 0.045f), cVidro, 0.95f);
                pb.localRotation = Quaternion.Euler(-38f, 0f, 0f);
                // Moldura superior do parabrisa + retrovisor preso por haste (zero flutuação)
                Peca(PrimitiveType.Cube, "Moldura_Superior_PB", raiz, new Vector3(0f, wsTopY, wsCenterZ - 0.10f), new Vector3(d.larg * 0.82f, 0.04f, 0.05f), cCromo, 0.88f);
                Peca(PrimitiveType.Cylinder, "Haste_Retrovisor_Interno", raiz, new Vector3(0f, wsTopY - 0.03f, wsCenterZ - 0.11f), new Vector3(0.014f, 0.03f, 0.014f), cCromo, 0.88f);
                Peca(PrimitiveType.Cube, "Retrovisor_Interno", raiz, new Vector3(0f, wsTopY - 0.05f, wsCenterZ - 0.12f), new Vector3(0.16f, 0.045f, 0.03f), new Color(0.10f, 0.11f, 0.13f), 0.3f);

                // Bancos concha esculpidos padrão VHC-52 (assento + encosto + apoio de cabeça + abas laterais)
                for (int s = -1; s <= 1; s += 2)
                {
                    float sx = s * d.larg * 0.21f;
                    Peca(PrimitiveType.Cube, s < 0 ? "Banco_Assento_E" : "Banco_Assento_D", raiz, new Vector3(sx, beltY + 0.04f, -0.06f), new Vector3(0.34f, 0.10f, 0.38f), cSec, 0.24f);
                    Peca(PrimitiveType.Cube, s < 0 ? "Banco_Encosto_E" : "Banco_Encosto_D", raiz, new Vector3(sx, beltY + 0.24f, -0.22f), new Vector3(0.32f, 0.38f, 0.10f), cSec, 0.24f)
                        .localRotation = Quaternion.Euler(-14f, 0f, 0f);
                    Peca(PrimitiveType.Cube, s < 0 ? "Banco_Cabeca_E" : "Banco_Cabeca_D", raiz, new Vector3(sx, beltY + 0.45f, -0.27f), new Vector3(0.18f, 0.14f, 0.08f), cDest, 0.28f);
                    if (d.extras.Contains("twin_rollbar"))
                    {
                        Peca(PrimitiveType.Cylinder, s < 0 ? "Santantonio_E" : "Santantonio_D", raiz, new Vector3(sx, beltY + 0.22f, -0.44f), new Vector3(0.28f, 0.22f, 0.06f), cCromo, 0.88f);
                    }
                }
            }
            else if (ehPicape)
            {
                float cabZ = hl * 0.14f;
                Peca(PrimitiveType.Cube, "Cabine_Picape", raiz,
                    new Vector3(0f, beltY + cabH * 0.45f, cabZ),
                    new Vector3(d.larg * 0.86f, cabH * 0.9f, cabL), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, "Vidros_Picape", raiz,
                    new Vector3(0f, beltY + cabH * 0.44f, cabZ),
                    new Vector3(d.larg * 0.88f, cabH * 0.62f, cabL * 0.90f), cVidro, 0.92f);
                Peca(PrimitiveType.Cube, "Cacamba_Tampa", raiz, new Vector3(0f, beltY + 0.16f, -hl + 0.10f), new Vector3(d.larg * 0.94f, 0.32f, 0.10f), cPrim, 0.7f);
                Peca(PrimitiveType.Cube, "Cacamba_E", raiz, new Vector3(-d.larg * 0.45f, beltY + 0.16f, -hl * 0.52f), new Vector3(0.08f, 0.32f, d.comp * 0.36f), cPrim, 0.7f);
                Peca(PrimitiveType.Cube, "Cacamba_D", raiz, new Vector3(d.larg * 0.45f, beltY + 0.16f, -hl * 0.52f), new Vector3(0.08f, 0.32f, d.comp * 0.36f), cPrim, 0.7f);
            }
            else
            {
                float cabZ = ehSuper ? -0.10f : -0.12f;
                Peca(PrimitiveType.Cube, "Cabine_Estrutura", raiz,
                    new Vector3(0f, beltY + cabH * 0.45f, cabZ),
                    new Vector3(d.larg * 0.85f, cabH * 0.9f, cabL), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, "Vidros_Cabine", raiz,
                    new Vector3(0f, beltY + cabH * 0.45f, cabZ),
                    new Vector3(d.larg * 0.87f, cabH * 0.64f, cabL * 0.88f), cVidro, 0.92f);
                Peca(PrimitiveType.Cube, "Vidro_Parabrisa", raiz,
                    new Vector3(0f, beltY + cabH * 0.45f, cabZ),
                    new Vector3(d.larg * 0.76f, cabH * 0.62f, cabL * 1.02f), cVidro, 0.92f);
            }

            // Volante com pivô exato na coluna de direção + Capô com pivô exato na dobradiça junto ao para-brisa
            if (d.arquetipo != "formula")
            {
                float volZ = (d.arquetipo == "roadster" || d.arquetipo == "convertible") ? cabL * 0.14f : (ehPicape ? hl * 0.24f : 0.22f);
                GameObject volPivo = new GameObject("Volante_Pivo");
                volPivo.transform.SetParent(raiz, false);
                volPivo.transform.localPosition = new Vector3(-d.larg * 0.21f, beltY + 0.08f, volZ);
                volPivo.transform.localRotation = Quaternion.Euler(24f, 0f, 0f);
                Peca(PrimitiveType.Cylinder, "Volante_Aro", volPivo.transform, Vector3.zero, new Vector3(0.32f, 0.025f, 0.32f), new Color(0.14f, 0.15f, 0.18f), 0.35f)
                    .localRotation = Quaternion.Euler(90f, 0f, 0f);
                Peca(PrimitiveType.Cube, "Volante_Raio", volPivo.transform, Vector3.zero, new Vector3(0.28f, 0.03f, 0.02f), cCromo, 0.75f);
                ctrl.volantePivo = volPivo.transform;

                float capoHingeZ = Mathf.Max(0.45f, hl * 0.32f);
                float capoLen = Mathf.Max(0.48f, hl - capoHingeZ - 0.05f);
                Transform capoPivo = CriarPivoArticulado(raiz, "Capo_Pivo", new Vector3(0f, beltY - 0.01f, capoHingeZ), new Vector3(-42f, 0f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Capo_Motor", capoPivo, new Vector3(0f, 0f, capoLen * 0.5f), new Vector3(d.larg * 0.78f, 0.035f, capoLen), cPrim, 0.76f);
            }
        }

        // 3. Grade Texturizada com Filetes, Entrada Inferior, Faróis de Neblina, Retrovisores, Maçanetas, Limpadores, Frisos, Antena & Panel Gaps
        float frontMaskZ = hl - 0.005f;
        Color corPretoFosco = new Color(0.08f, 0.08f, 0.10f);
        Peca(PrimitiveType.Cube, "Grade_Frontal", raiz,
            new Vector3(0f, d.vao + corpoH * 0.54f, frontMaskZ + 0.015f),
            new Vector3(d.larg * 0.48f, corpoH * 0.30f, 0.055f), corPretoFosco, 0.38f);
        for (int fg = -1; fg <= 1; fg++)
        {
            Peca(PrimitiveType.Cube, "Filete_Grade_" + (fg + 1), raiz,
                new Vector3(0f, d.vao + corpoH * 0.54f + fg * (corpoH * 0.09f), frontMaskZ + 0.024f),
                new Vector3(d.larg * 0.45f, 0.014f, 0.048f), new Color(0.11f, 0.12f, 0.14f), 0.45f);
        }

        Color corPara = d.extras.Contains("chrome_bumpers") ? cCromo : cSec;
        Peca(PrimitiveType.Cube, "Parachoque_F", raiz, new Vector3(0f, d.vao + 0.09f, hl - 0.02f), new Vector3(d.larg * 0.96f, 0.14f, 0.12f), corPara, 0.5f);
        Peca(PrimitiveType.Cube, "Parachoque_T", raiz, new Vector3(0f, d.vao + 0.09f, -hl + 0.02f), new Vector3(d.larg * 0.96f, 0.14f, 0.12f), corPara, 0.5f);

        // Entrada de ar inferior do para-choque + filetes horizontais
        Peca(PrimitiveType.Cube, "Entrada_Ar_Inferior", raiz,
            new Vector3(0f, d.vao + 0.085f, hl + 0.025f),
            new Vector3(d.larg * 0.52f, 0.075f, 0.055f), corPretoFosco, 0.35f);
        Peca(PrimitiveType.Cube, "Filete_Entrada_Inferior", raiz,
            new Vector3(0f, d.vao + 0.085f, hl + 0.032f),
            new Vector3(d.larg * 0.48f, 0.012f, 0.048f), new Color(0.13f, 0.14f, 0.16f), 0.42f);

        // Antena Shark-Fin no teto + Frisos pretos das janelas + Limpadores de para-brisa + Panel Gaps
        if (!ehOnibus && d.arquetipo != "convertible" && d.arquetipo != "roadster" && d.arquetipo != "buggy" && d.arquetipo != "formula")
        {
            Peca(PrimitiveType.Cube, "Antena_Teto", raiz,
                new Vector3(0f, d.alt + 0.032f, -cabL * 0.24f),
                new Vector3(0.032f, 0.068f, 0.15f), corPretoFosco, 0.45f);
            Peca(PrimitiveType.Cube, "Friso_Janela_Superior_PB", raiz,
                new Vector3(0f, d.alt - 0.03f, cabL * 0.22f),
                new Vector3(d.larg * 0.78f, 0.020f, 0.030f), corPretoFosco, 0.38f);
        }
        if (d.arquetipo != "formula")
        {
            for (int w = -1; w <= 1; w += 2)
            {
                Peca(PrimitiveType.Cube, w < 0 ? "Limpador_Parabrisa_E" : "Limpador_Parabrisa_D", raiz,
                    new Vector3(w * d.larg * 0.17f, beltY + 0.03f, Mathf.Max(0.42f, hl * 0.30f)),
                    new Vector3(0.28f, 0.014f, 0.020f), corPretoFosco, 0.35f)
                    .localRotation = Quaternion.Euler(0f, 0f, 5f);
            }
            // Linhas finas de recorte (Panel Gaps) separando capô e portas
            Color corRecorte = new Color(0.03f, 0.03f, 0.04f);
            float zCapoHinge = Mathf.Max(0.45f, hl * 0.32f);
            float lenCapo = Mathf.Max(0.48f, hl - zCapoHinge - 0.05f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Recorte_Capo_E" : "Recorte_Capo_D", raiz,
                    new Vector3(s * d.larg * 0.39f, beltY + 0.015f, zCapoHinge + lenCapo * 0.5f),
                    new Vector3(0.008f, 0.008f, lenCapo), corRecorte, 0.2f);
                Peca(PrimitiveType.Cube, s < 0 ? "Recorte_Porta_F_E" : "Recorte_Porta_F_D", raiz,
                    new Vector3(s * (d.larg * 0.498f), d.vao + corpoH * 0.52f, 0.48f),
                    new Vector3(0.008f, corpoH * 0.80f, 0.008f), corRecorte, 0.2f);
                Peca(PrimitiveType.Cube, s < 0 ? "Recorte_Porta_T_E" : "Recorte_Porta_T_D", raiz,
                    new Vector3(s * (d.larg * 0.498f), d.vao + corpoH * 0.52f, 0.48f - ((ehCaminhao || ehFurgao) ? 0.78f : 0.96f)),
                    new Vector3(0.008f, corpoH * 0.80f, 0.008f), corRecorte, 0.2f);
            }
        }

        for (int s = -1; s <= 1; s += 2)
        {
            Transform f = PecaEmissiva(PrimitiveType.Cube, s < 0 ? "Farol_E" : "Farol_D", raiz,
                new Vector3(s * d.larg * 0.35f, d.vao + corpoH * 0.62f, frontMaskZ + 0.025f),
                new Vector3(d.larg * 0.18f, 0.10f, 0.07f));
            ctrl.farois.Add(f.GetComponent<Renderer>());

            if (!ehSuper && d.arquetipo != "formula")
            {
                Transform fn = PecaEmissiva(PrimitiveType.Cylinder, s < 0 ? "Farol_Neblina_E" : "Farol_Neblina_D", raiz,
                    new Vector3(s * d.larg * 0.36f, d.vao + 0.088f, hl + 0.028f),
                    new Vector3(0.055f, 0.022f, 0.055f));
                fn.localRotation = Quaternion.Euler(90f, 0f, 0f);
                ctrl.farois.Add(fn.GetComponent<Renderer>());
            }

            Transform l = PecaEmissiva(PrimitiveType.Cube, s < 0 ? "Lanterna_E" : "Lanterna_D", raiz,
                new Vector3(s * d.larg * 0.35f, d.vao + corpoH * 0.64f, -hl - 0.015f),
                new Vector3(d.larg * 0.20f, 0.09f, 0.07f));
            ctrl.lanternas.Add(l.GetComponent<Renderer>());

            if (d.arquetipo != "formula" && d.arquetipo != "buggy" && !ehOnibus)
            {
                float zDobradica = (ehCaminhao || ehFurgao) ? (hl - cabL * 0.12f) : 0.48f;
                float compPorta = (ehCaminhao || ehFurgao) ? 0.78f : 0.96f;
                Transform pivoPorta = CriarPivoArticulado(raiz, s < 0 ? "Porta_E" : "Porta_D",
                    new Vector3(s * xPortaFlush, d.vao + corpoH * 0.52f, zDobradica),
                    ehSuper ? new Vector3(-56f, s * 14f, s * 16f) : new Vector3(0f, s * -64f, 0f),
                    Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Folha_Porta", pivoPorta, new Vector3(0f, 0f, -compPorta * 0.5f), new Vector3(0.056f, corpoH * 0.80f, compPorta), cPrim, 0.75f);
                Peca(PrimitiveType.Cube, "Friso_Porta", pivoPorta, new Vector3(s * 0.025f, corpoH * 0.36f, -compPorta * 0.5f), new Vector3(0.015f, 0.03f, compPorta * 0.96f), corPretoFosco, 0.35f);
                Peca(PrimitiveType.Cube, s < 0 ? "Macaneta_E" : "Macaneta_D", pivoPorta, new Vector3(s * 0.034f, corpoH * 0.26f, -compPorta * 0.76f), new Vector3(0.022f, 0.024f, 0.13f), cCromo, 0.86f);
                Peca(PrimitiveType.Cube, "Friso_Janela_Porta", pivoPorta, new Vector3(s * 0.012f, corpoH * 0.41f, -compPorta * 0.5f), new Vector3(0.018f, 0.022f, compPorta * 0.96f), corPretoFosco, 0.38f);
                Peca(PrimitiveType.Cube, "Retrovisor", pivoPorta, new Vector3(s * 0.09f, corpoH * 0.42f, -0.14f), new Vector3(0.14f, 0.08f, 0.10f), cPrim, 0.7f);
            }
            else
            {
                float xEsp = d.arquetipo == "buggy" ? (d.larg * 0.27f + 0.06f) : d.larg * 0.54f;
                float yEsp = d.arquetipo == "buggy" ? d.vao + (d.alt - d.vao) * 0.46f : beltY + 0.08f;
                float zEsp = d.arquetipo == "buggy" ? 0.32f : hl * 0.28f;
                Peca(PrimitiveType.Cube, "Retrovisor", raiz,
                    new Vector3(s * xEsp, yEsp, zEsp),
                    new Vector3(0.14f, 0.08f, 0.10f), cPrim, 0.7f);
            }
        }

        // 4. Rodas Multi-Peças (com eixo triplo para caminhões/articulados)
        if (d.raioRoda > 0.05f && d.eixos > 0.1f)
        {
            float zF = d.eixos * 0.5f;
            float zT = -d.eixos * 0.5f;
            float xR = d.larg * 0.46f;
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FE", new Vector3(-xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FD", new Vector3(xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_TE", new Vector3(-xR, d.raioRoda, zT), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_TD", new Vector3(xR, d.raioRoda, zT), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            if (d.arquetipo == "semi_truck" || d.arquetipo == "dump_truck" || d.arquetipo == "mixer_truck" || d.arquetipo == "firetruck" || d.arquetipo == "articulated_bus")
            {
                float zM = d.arquetipo == "articulated_bus" ? 0.15f : zT + d.raioRoda * 2.35f;
                ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_ME", new Vector3(-xR, d.raioRoda, zM), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
                ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_MD", new Vector3(xR, d.raioRoda, zM), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            }
        }

        // 5. Extras específicos
        if (d.extras.Contains("spoiler_gt") || d.extras.Contains("wing_swan") || d.extras.Contains("f1_wings"))
        {
            Peca(PrimitiveType.Cube, "Aerofolio_Asa", raiz, new Vector3(0f, beltY + 0.26f, -hl + 0.20f), new Vector3(d.larg * 0.94f, 0.04f, 0.28f), cSec, 0.5f);
            Peca(PrimitiveType.Cube, "Suporte_Asa_E", raiz, new Vector3(-d.larg * 0.25f, beltY + 0.13f, -hl + 0.20f), new Vector3(0.04f, 0.26f, 0.14f), cSec, 0.5f);
            Peca(PrimitiveType.Cube, "Suporte_Asa_D", raiz, new Vector3(d.larg * 0.25f, beltY + 0.13f, -hl + 0.20f), new Vector3(0.04f, 0.26f, 0.14f), cSec, 0.5f);
        }
        if (d.extras.Contains("blower_v8"))
            Peca(PrimitiveType.Cube, "Supercharger_V8", raiz, new Vector3(0f, beltY + 0.14f, hl * 0.52f), new Vector3(0.36f, 0.26f, 0.44f), cCromo, 0.92f);

        if (d.extras.Contains("lightbar_police"))
        {
            float zGiro = (ehCaminhao || ehFurgao) ? hl - cabL * 0.5f - 0.1f : 0.1f;
            Transform gV = PecaEmissiva(PrimitiveType.Cube, "Giroflex_Vermelho", raiz, new Vector3(-0.32f, d.alt + 0.06f, zGiro), new Vector3(0.55f, 0.10f, 0.22f));
            Transform gA = PecaEmissiva(PrimitiveType.Cube, "Giroflex_Azul", raiz, new Vector3(0.32f, d.alt + 0.06f, zGiro), new Vector3(0.55f, 0.10f, 0.22f));
            ctrl.giroflexVermelho.Add(gV.GetComponent<Renderer>());
            ctrl.giroflexAzul.Add(gA.GetComponent<Renderer>());
        }
        if (d.extras.Contains("lightbar_amber") || d.extras.Contains("taxi_sign"))
        {
            Transform gAm = PecaEmissiva(PrimitiveType.Cube, "Luminoso_Ambar", raiz, new Vector3(0f, d.alt + 0.06f, 0.1f), new Vector3(0.65f, 0.12f, 0.22f));
            ctrl.giroflexAmbar.Add(gAm.GetComponent<Renderer>());
        }
        if (d.extras.Contains("pushbar") || d.extras.Contains("bullbar"))
            Peca(PrimitiveType.Cube, "QuebraMato", raiz, new Vector3(0f, d.vao + 0.30f, hl + 0.12f), new Vector3(d.larg * 0.66f, 0.36f, 0.08f), cSec, 0.4f);

        if (d.extras.Contains("bus_ac"))
        {
            int nAc = d.comp > 14f ? 3 : 2;
            for (int a = 0; a < nAc; a++)
                Peca(PrimitiveType.Cube, "Ar_Condicionado_" + a, raiz, new Vector3(0f, d.alt + 0.10f, -d.comp * 0.22f + a * 3.4f), new Vector3(d.larg * 0.58f, 0.20f, 1.35f), cSec, 0.5f);
        }
        if (d.extras.Contains("mixer_drum"))
        {
            Transform tambor = Peca(PrimitiveType.Cylinder, "Tambor_Betoneira", raiz, new Vector3(0f, d.alt * 0.62f, -d.comp * 0.14f), new Vector3(d.larg * 0.76f, d.comp * 0.24f, d.larg * 0.76f), cSec, 0.5f);
            tambor.localRotation = Quaternion.Euler(78f, 0f, 0f);
            ctrl.tamborBetoneira = tambor;
        }
        if (d.extras.Contains("sweeper_brushes"))
        {
            for (int s = -1; s <= 1; s += 2)
            {
                Transform esc = Peca(PrimitiveType.Cylinder, "Escova_Varredoura", raiz, new Vector3(s * d.larg * 0.44f, 0.12f, hl + 0.22f), new Vector3(0.72f, 0.08f, 0.72f), cDest, 0.3f);
                ctrl.escovasVarredoura.Add(esc);
            }
        }
        if (d.extras.Contains("spare_rear"))
            CriarRoda(raiz, "Estepe_Traseiro", new Vector3(0f, beltY + 0.15f, -hl - 0.16f), d.raioRoda * 0.9f, d.largRoda, cPneu, cAro, cDest).localRotation = Quaternion.Euler(0f, 90f, 0f);
    }

    private static void MontarMotoOuAtv(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cPneu, Color cAro, Color cCromo)
    {
        float zF = d.eixos * 0.5f;
        float zT = -d.eixos * 0.5f;
        Color cEscuro = new Color(0.11f, 0.12f, 0.14f);

        if (d.arquetipo == "atv")
        {
            // ATV Cyberquad angular multifacetado com suspensão aparente e guidão conectado por coluna
            float xR = d.larg * 0.41f;
            float chY = d.vao + 0.06f;
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FE", new Vector3(-xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FD", new Vector3(xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_TE", new Vector3(-xR, d.raioRoda, zT), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_TD", new Vector3(xR, d.raioRoda, zT), d.raioRoda, d.largRoda, cPneu, cAro, cDest));

            Peca(PrimitiveType.Cube, "Chassi_Tubular_ATV", raiz, new Vector3(0f, chY + 0.14f, 0f), new Vector3(d.larg * 0.34f, 0.22f, d.comp * 0.66f), cEscuro, 0.35f);
            Peca(PrimitiveType.Cube, "Carenagem_Angular_ATV", raiz, new Vector3(0f, chY + 0.34f, 0.04f), new Vector3(d.larg * 0.46f, 0.24f, d.comp * 0.68f), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Capo_Facetado_ATV", raiz, new Vector3(0f, chY + 0.44f, zF * 0.72f), new Vector3(d.larg * 0.48f, 0.16f, d.comp * 0.28f), cPrim, 0.72f)
                .localRotation = Quaternion.Euler(20f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Motor_Bloco", raiz, new Vector3(0f, chY + 0.16f, 0.02f), new Vector3(d.larg * 0.30f, 0.24f, 0.42f), cAro, 0.75f);
            Peca(PrimitiveType.Cube, "Assento", raiz, new Vector3(0f, chY + 0.52f, -0.14f), new Vector3(d.larg * 0.28f, 0.12f, d.comp * 0.40f), cSec, 0.25f);
            Peca(PrimitiveType.Cube, "Bagageiro_Tras_ATV", raiz, new Vector3(0f, chY + 0.56f, zT * 0.84f), new Vector3(d.larg * 0.58f, 0.05f, 0.38f), cEscuro, 0.4f);

            float atvBarY = Mathf.Max(d.alt * 0.88f, chY + 0.72f);
            float atvBarZ = zF * 0.34f;
            Peca(PrimitiveType.Cylinder, "Coluna_Direcao_ATV", raiz, new Vector3(0f, (chY + 0.52f + atvBarY) * 0.5f, (zF * 0.44f + atvBarZ) * 0.5f), new Vector3(0.045f, 0.16f, 0.045f), cEscuro, 0.45f)
                .localRotation = Quaternion.Euler(-22f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Mesa_Guidao_ATV", raiz, new Vector3(0f, atvBarY - 0.01f, atvBarZ), new Vector3(0.11f, 0.04f, 0.06f), cAro, 0.8f);
            Transform guidaoAtv = Peca(PrimitiveType.Cylinder, "Guidao", raiz, new Vector3(0f, atvBarY, atvBarZ), new Vector3(0.036f, d.larg * 0.37f, 0.036f), cEscuro, 0.65f);
            guidaoAtv.localRotation = Quaternion.Euler(0f, 0f, 90f);

            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_F_ATV_E" : "Paralama_F_ATV_D", raiz, new Vector3(s * d.larg * 0.32f, chY + 0.40f, zF * 0.76f), new Vector3(d.larg * 0.24f, 0.06f, d.comp * 0.32f), cPrim, 0.72f);
                Peca(PrimitiveType.Cube, s < 0 ? "Paralama_T_ATV_E" : "Paralama_T_ATV_D", raiz, new Vector3(s * d.larg * 0.31f, chY + 0.44f, zT * 0.78f), new Vector3(d.larg * 0.24f, 0.06f, d.comp * 0.32f), cPrim, 0.72f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Braco_Susp_ATV_E" : "Braco_Susp_ATV_D", raiz, new Vector3(s * d.larg * 0.25f, d.raioRoda + 0.04f, zF), new Vector3(0.035f, d.larg * 0.14f, 0.035f), cAro, 0.8f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Amortecedor_ATV_E" : "Amortecedor_ATV_D", raiz, new Vector3(s * d.larg * 0.22f, chY + 0.22f, zF - 0.02f), new Vector3(0.055f, 0.16f, 0.055f), cDest, 0.85f)
                    .localRotation = Quaternion.Euler(0f, 0f, s * 22f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Manopla_ATV_E" : "Manopla_ATV_D", raiz, new Vector3(s * d.larg * 0.31f, atvBarY, atvBarZ), new Vector3(0.046f, 0.07f, 0.046f), cPneu, 0.2f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Haste_Retrovisor_ATV_E" : "Haste_Retrovisor_ATV_D", raiz, new Vector3(s * d.larg * 0.26f, atvBarY + 0.06f, atvBarZ), new Vector3(0.018f, 0.06f, 0.018f), cCromo, 0.88f)
                    .localRotation = Quaternion.Euler(0f, 0f, s * -16f);
                Peca(PrimitiveType.Cube, s < 0 ? "Retrovisor_Guidao_E" : "Retrovisor_Guidao_D", raiz, new Vector3(s * d.larg * 0.29f, atvBarY + 0.12f, atvBarZ - 0.01f), new Vector3(0.11f, 0.055f, 0.03f), cEscuro, 0.45f);
            }

            Transform fAtv = PecaEmissiva(PrimitiveType.Cube, "Farol_LED_ATV", raiz, new Vector3(0f, chY + 0.38f, d.comp * 0.45f), new Vector3(d.larg * 0.42f, 0.055f, 0.05f));
            ctrl.farois.Add(fAtv.GetComponent<Renderer>());
            return;
        }
        else if (d.arquetipo == "trike")
        {
            float xR = d.larg * 0.42f;
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FE", new Vector3(-xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_FD", new Vector3(xR, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_Traseira", new Vector3(0f, d.raioRoda, zT), d.raioRoda, d.largRoda * 1.45f, cPneu, cAro, cDest));
            Peca(PrimitiveType.Cube, "Carenagem_Trike", raiz, new Vector3(0f, d.vao + 0.34f, 0.1f), new Vector3(d.larg * 0.44f, 0.36f, d.comp * 0.68f), cPrim, 0.75f);
            Peca(PrimitiveType.Cube, "Motor_Bloco", raiz, new Vector3(0f, d.vao + 0.22f, 0f), new Vector3(0.28f, 0.30f, 0.38f), cAro, 0.75f);
            Peca(PrimitiveType.Cube, "Assento", raiz, new Vector3(0f, d.vao + 0.50f, -0.22f), new Vector3(0.40f, 0.16f, 0.72f), cSec, 0.25f);

            float trBarY = d.vao + 0.68f;
            float trBarZ = d.comp * 0.04f;
            Peca(PrimitiveType.Cylinder, "Coluna_Direcao_Trike", raiz, new Vector3(0f, d.vao + 0.56f, d.comp * 0.07f), new Vector3(0.045f, 0.14f, 0.045f), cEscuro, 0.5f)
                .localRotation = Quaternion.Euler(-22f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Mesa_Guidao_Trike", raiz, new Vector3(0f, trBarY - 0.01f, trBarZ), new Vector3(0.11f, 0.04f, 0.06f), cAro, 0.8f);
            Transform guidaoTr = Peca(PrimitiveType.Cylinder, "Guidao", raiz, new Vector3(0f, trBarY, trBarZ), new Vector3(0.036f, d.larg * 0.24f, 0.036f), cCromo, 0.85f);
            guidaoTr.localRotation = Quaternion.Euler(0f, 0f, 90f);

            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cylinder, s < 0 ? "Braco_Trike_E" : "Braco_Trike_D", raiz, new Vector3(s * d.larg * 0.28f, d.raioRoda + 0.02f, zF), new Vector3(0.04f, d.larg * 0.16f, 0.04f), cEscuro, 0.4f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Manopla_Trike_E" : "Manopla_Trike_D", raiz, new Vector3(s * d.larg * 0.20f, trBarY, trBarZ), new Vector3(0.046f, 0.07f, 0.046f), cPneu, 0.2f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Haste_Retrovisor_Trike_E" : "Haste_Retrovisor_Trike_D", raiz, new Vector3(s * d.larg * 0.16f, trBarY + 0.06f, trBarZ), new Vector3(0.018f, 0.06f, 0.018f), cCromo, 0.88f);
                Peca(PrimitiveType.Cube, s < 0 ? "Retrovisor_Guidao_E" : "Retrovisor_Guidao_D", raiz, new Vector3(s * d.larg * 0.18f, trBarY + 0.12f, trBarZ - 0.01f), new Vector3(0.11f, 0.055f, 0.03f), cEscuro, 0.45f);
            }
            Transform fTr = PecaEmissiva(PrimitiveType.Sphere, "Farol_Trike", raiz, new Vector3(0f, d.vao + 0.56f, zF * 0.72f), new Vector3(0.18f, 0.16f, 0.16f));
            ctrl.farois.Add(fTr.GetComponent<Renderer>());
            return;
        }

        // Moto 2 rodas de alto detalhe (5 arquétipos: Scooter, Cruiser, Dirt, Naked/Streetfighter, Superbike Carenada)
        bool ehScooter = d.arquetipo == "scooter";
        bool ehCruiser = d.arquetipo == "cruiser";
        bool ehDirt = d.arquetipo == "dirtbike";
        bool ehNaked = d.arquetipo == "sportbike" && (d.codigo == "VHC-71" || d.codigo == "VHC-72");
        bool ehSport = d.arquetipo == "sportbike" && !ehNaked;

        ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Roda_Dianteira", new Vector3(0f, d.raioRoda, zF), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
        ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_Traseira", new Vector3(0f, d.raioRoda, zT), d.raioRoda, d.largRoda * (ehSport || ehCruiser ? 1.32f : 1.22f), cPneu, cAro, cDest));

        float headZ = ehCruiser ? zF * 0.52f : zF * 0.64f;
        float headY = d.vao + (ehDirt ? 0.78f : 0.70f);
        float forkSpan = ehScooter ? 0.085f : 0.105f;
        Vector3 mesaTop = new Vector3(0f, headY, headZ - 0.01f);

        // Mesa superior/inferior + bengalas duplas ligando mesa ao eixo dianteiro
        Peca(PrimitiveType.Cube, "Mesa_Superior", raiz, mesaTop, new Vector3(forkSpan * 2.5f, 0.032f, 0.085f), cAro, 0.8f);
        Peca(PrimitiveType.Cube, "Mesa_Inferior", raiz, new Vector3(0f, headY - 0.14f, headZ + 0.04f), new Vector3(forkSpan * 2.4f, 0.032f, 0.08f), cAro, 0.8f);
        for (int s = -1; s <= 1; s += 2)
        {
            Vector3 pEixo = new Vector3(s * forkSpan, d.raioRoda, zF);
            Vector3 pMesa = new Vector3(s * forkSpan, headY + 0.03f, headZ - 0.01f);
            Vector3 mid = Vector3.Lerp(pEixo, pMesa, 0.5f);
            float compGarfo = Vector3.Distance(pEixo, pMesa);
            Transform garfo = Peca(PrimitiveType.Cylinder, s < 0 ? "Garfo_E" : "Garfo_D", raiz, mid, new Vector3(0.052f, compGarfo * 0.5f, 0.052f), (ehSport || ehDirt) ? cDest : cCromo, 0.86f);
            garfo.rotation = Quaternion.FromToRotation(Vector3.up, (pMesa - pEixo).normalized);

            // Quadro tubular / treliça + balança traseira + amortecedor coil-over
            Peca(PrimitiveType.Cube, s < 0 ? "Quadro_Berco_E" : "Quadro_Berco_D", raiz, new Vector3(s * 0.11f, d.vao + 0.38f, 0.04f), new Vector3(0.036f, 0.042f, d.eixos * 0.62f), ehNaked ? cDest : cEscuro, 0.45f)
                .localRotation = Quaternion.Euler(-20f, 0f, 0f);
            Peca(PrimitiveType.Cube, s < 0 ? "Balanca_Tras_E" : "Balanca_Tras_D", raiz, new Vector3(s * 0.11f, d.raioRoda + 0.03f, zT * 0.58f), new Vector3(0.042f, 0.055f, Mathf.Abs(zT) * 0.72f), cAro, 0.75f);
            Peca(PrimitiveType.Cylinder, s < 0 ? "Amortecedor_E" : "Amortecedor_D", raiz, new Vector3(s * 0.125f, d.vao + 0.38f, zT + 0.18f), new Vector3(0.065f, 0.16f, 0.065f), ehSport ? cDest : cCromo, 0.85f)
                .localRotation = Quaternion.Euler(-22f, 0f, 0f);
        }

        // Disco de freio dianteiro + coroa traseira
        if (!ehScooter)
        {
            Peca(PrimitiveType.Cylinder, "Disco_Freio_F", raiz, new Vector3(d.largRoda * 0.56f, d.raioRoda, zF), new Vector3(d.raioRoda * 1.12f, 0.015f, d.raioRoda * 1.12f), cAro, 0.82f)
                .localRotation = Quaternion.Euler(0f, 0f, 90f);
        }

        // Motor aletado (ou V-Twin nas cruisers) + cárter
        Peca(PrimitiveType.Cube, "Motor_Carter", raiz, new Vector3(0f, d.vao + 0.18f, -0.02f), new Vector3(0.27f, 0.20f, 0.36f), cAro, 0.78f);
        if (ehCruiser)
        {
            for (int v = -1; v <= 1; v += 2)
                Peca(PrimitiveType.Cylinder, v < 0 ? "Cilindro_V_Tras" : "Cilindro_V_Frente", raiz, new Vector3(0f, d.vao + 0.36f, v * 0.10f), new Vector3(0.18f, 0.12f, 0.18f), cEscuro, 0.5f)
                    .localRotation = Quaternion.Euler(v * 22f, 0f, 0f);
        }
        else if (!ehScooter)
        {
            Peca(PrimitiveType.Cube, "Cilindros_Aletados", raiz, new Vector3(0f, d.vao + 0.36f, 0.08f), new Vector3(0.25f, 0.22f, 0.24f), cEscuro, 0.45f)
                .localRotation = Quaternion.Euler(14f, 0f, 0f);
        }

        // Carenagens & Tanque esculpido por arquétipo
        if (ehScooter)
        {
            Peca(PrimitiveType.Cube, "Escudo_Frontal_Scooter", raiz, new Vector3(0f, d.vao + 0.44f, zF * 0.54f), new Vector3(0.42f, 0.58f, 0.22f), cPrim, 0.78f)
                .localRotation = Quaternion.Euler(-16f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Assoalho_Scooter", raiz, new Vector3(0f, d.vao + 0.10f, 0.08f), new Vector3(0.40f, 0.08f, 0.52f), cEscuro, 0.3f);
            Peca(PrimitiveType.Cube, "Carenagem_Traseira_Scooter", raiz, new Vector3(0f, d.vao + 0.33f, zT + 0.22f), new Vector3(0.44f, 0.34f, 0.76f), cPrim, 0.78f);
        }
        else
        {
            Peca(PrimitiveType.Cube, "Tanque_Esculpido", raiz, new Vector3(0f, d.vao + (ehCruiser ? 0.58f : 0.64f), 0.20f), new Vector3(ehDirt ? 0.24f : 0.35f, 0.24f, 0.54f), cPrim, 0.82f)
                .localRotation = Quaternion.Euler(-10f, 0f, 0f);
            if (ehSport)
            {
                Peca(PrimitiveType.Cube, "Carenagem_Frontal_Sport", raiz, new Vector3(0f, d.vao + 0.64f, zF * 0.62f), new Vector3(0.40f, 0.32f, 0.48f), cPrim, 0.82f);
                Peca(PrimitiveType.Cube, "Quilha_Inferior_Sport", raiz, new Vector3(0f, d.vao + 0.16f, 0.04f), new Vector3(0.30f, 0.18f, 0.62f), cSec, 0.72f);
                Peca(PrimitiveType.Cube, "Bolha_Esportiva", raiz, new Vector3(0f, d.vao + 0.88f, zF * 0.56f), new Vector3(0.30f, 0.24f, 0.03f), new Color(0.25f, 0.32f, 0.40f, 0.65f), 0.94f)
                    .localRotation = Quaternion.Euler(-38f, 0f, 0f);
            }
            if (ehDirt)
                Peca(PrimitiveType.Cube, "Paralama_Bico_Cross", raiz, new Vector3(0f, headY - 0.12f, zF * 0.82f), new Vector3(0.16f, 0.04f, 0.44f), cPrim, 0.72f)
                    .localRotation = Quaternion.Euler(-8f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Rabeta_Moto", raiz, new Vector3(0f, d.vao + (ehCruiser ? 0.50f : 0.66f), zT + 0.04f), new Vector3(0.26f, 0.11f, 0.44f), cPrim, 0.8f)
                .localRotation = Quaternion.Euler(ehCruiser ? -4f : 12f, 0f, 0f);
        }

        Peca(PrimitiveType.Cube, "Assento", raiz, new Vector3(0f, d.vao + (ehCruiser ? 0.46f : 0.56f), -0.26f), new Vector3(ehCruiser ? 0.34f : 0.28f, 0.12f, 0.62f), cSec, 0.25f);
        float motoBarY = ehSport ? headY + 0.04f : (ehCruiser ? headY + 0.14f : headY + 0.10f);
        float motoBarZ = headZ - 0.05f;
        float barHalfW = d.larg * (ehSport ? 0.38f : 0.44f);
        Transform guidao = Peca(PrimitiveType.Cylinder, "Guidao", raiz, new Vector3(0f, motoBarY, motoBarZ), new Vector3(0.032f, barHalfW, 0.032f), cCromo, 0.85f);
        guidao.localRotation = Quaternion.Euler(0f, 0f, 90f);
        for (int s = -1; s <= 1; s += 2)
        {
            if (ehSport)
            {
                Peca(PrimitiveType.Cylinder, s < 0 ? "Colar_ClipOn_E" : "Colar_ClipOn_D", raiz, new Vector3(s * forkSpan, headY + 0.02f, headZ - 0.01f), new Vector3(0.072f, 0.022f, 0.072f), cAro, 0.85f);
                Peca(PrimitiveType.Cube, s < 0 ? "Braco_ClipOn_E" : "Braco_ClipOn_D", raiz, new Vector3(s * (forkSpan + 0.06f), motoBarY, motoBarZ + 0.02f), new Vector3(0.14f, 0.028f, 0.04f), cAro, 0.82f);
            }
            else
            {
                float riserX = s * 0.055f;
                Vector3 pMesaBar = new Vector3(riserX, headY + 0.015f, headZ - 0.01f);
                Vector3 pBarClamp = new Vector3(riserX, motoBarY, motoBarZ);
                Transform riser = Peca(PrimitiveType.Cylinder, s < 0 ? "Riser_Guidao_E" : "Riser_Guidao_D", raiz, Vector3.Lerp(pMesaBar, pBarClamp, 0.5f), new Vector3(0.038f, Vector3.Distance(pMesaBar, pBarClamp) * 0.52f, 0.038f), cAro, 0.86f);
                riser.rotation = Quaternion.FromToRotation(Vector3.up, (pBarClamp - pMesaBar).normalized);
            }
            Peca(PrimitiveType.Cylinder, s < 0 ? "Manopla_E" : "Manopla_D", raiz, new Vector3(s * barHalfW * 0.84f, motoBarY, motoBarZ), new Vector3(0.044f, 0.065f, 0.044f), cPneu, 0.2f)
                .localRotation = Quaternion.Euler(0f, 0f, 90f);
            Peca(PrimitiveType.Cylinder, s < 0 ? "Haste_Retrovisor_Moto_E" : "Haste_Retrovisor_Moto_D", raiz, new Vector3(s * barHalfW * 0.64f, motoBarY + 0.06f, motoBarZ), new Vector3(0.018f, 0.06f, 0.018f), cCromo, 0.88f)
                .localRotation = Quaternion.Euler(0f, 0f, s * -16f);
            Peca(PrimitiveType.Cube, s < 0 ? "Retrovisor_Guidao_E" : "Retrovisor_Guidao_D", raiz, new Vector3(s * barHalfW * 0.72f, motoBarY + 0.12f, motoBarZ - 0.01f), new Vector3(0.105f, 0.055f, 0.03f), cEscuro, 0.45f);
        }

        if (ehSport)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                Transform fProj = PecaEmissiva(PrimitiveType.Cylinder, s < 0 ? "Farol_Projetor_E" : "Farol_Projetor_D", raiz, new Vector3(s * 0.105f, d.vao + 0.65f, zF * 0.80f), new Vector3(0.065f, 0.04f, 0.065f));
                fProj.localRotation = Quaternion.Euler(90f, 0f, 0f);
                ctrl.farois.Add(fProj.GetComponent<Renderer>());
            }
        }
        else
        {
            Transform f = PecaEmissiva(PrimitiveType.Cylinder, "Farol_Moto", raiz, new Vector3(0f, headY - 0.02f, headZ + 0.14f), new Vector3(0.19f, 0.05f, 0.19f));
            f.localRotation = Quaternion.Euler(90f, 0f, 0f);
            ctrl.farois.Add(f.GetComponent<Renderer>());
        }

        // Escapamento com ponteira (exceto elétrica)
        if (!d.extras.Contains("electric") && d.codigo != "VHC-76")
        {
            Peca(PrimitiveType.Cylinder, "Escapamento_Ponteira", raiz, new Vector3(0.20f, d.vao + (ehDirt ? 0.46f : 0.24f), zT + 0.10f), new Vector3(0.095f, 0.22f, 0.095f), ehCruiser ? cCromo : cAro, 0.86f)
                .localRotation = Quaternion.Euler(ehCruiser ? 88f : 74f, 0f, 0f);
        }

        if (d.extras.Contains("moto_box"))
            Peca(PrimitiveType.Cube, "Bau_Entregas", raiz, new Vector3(0f, d.vao + 0.78f, zT - 0.04f), new Vector3(0.48f, 0.44f, 0.48f), cDest, 0.5f);
    }

    private static void MontarBicicleta(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cPneu, Color cAro, Color cCromo)
    {
        float zF = d.eixos * 0.5f;
        float zT = -d.eixos * 0.5f;
        float r = Mathf.Max(0.22f, d.raioRoda);
        bool ehBmx = d.extras.Contains("bike_bmx");
        bool ehSpeed = d.extras.Contains("bike_speed");
        bool ehCesta = d.extras.Contains("bike_basket");
        bool temBagageiro = d.extras.Contains("bike_rack");
        bool temPegs = d.extras.Contains("bike_pegs");
        Color cEscuro = new Color(0.14f, 0.15f, 0.17f);

        float bbY = ehBmx ? 0.275f : 0.285f;
        float bbZ = ehBmx ? -0.04f : -0.075f;
        float selimY = ehBmx ? 0.565f : (ehSpeed ? 0.895f : 0.785f);
        float selimZ = bbZ - (selimY - bbY) * 0.29f;
        float headZ = zF * 0.76f;
        float headBotY = r * 2f + (ehBmx ? 0.045f : 0.055f);
        float headTopY = headBotY + (ehBmx ? 0.125f : (ehCesta ? 0.195f : 0.165f));

        // Roda Traseira + Cassete + Pegs Traseiros
        ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_Traseira", new Vector3(0f, r, zT), r, d.largRoda, cPneu, cAro, cDest));
        Peca(PrimitiveType.Cylinder, "Cassete_Traseiro", raiz, new Vector3(0.032f, r, zT), new Vector3(0.08f, 0.006f, 0.08f), cCromo, 0.85f)
            .localRotation = Quaternion.Euler(0f, 0f, 90f);

        // Quadro Principal (Head tube, Seat tube, Top tube, Down tube, Stays)
        Vector3 pHeadBot = new Vector3(0f, headBotY, headZ);
        Vector3 pHeadTop = new Vector3(0f, headTopY, headZ - 0.045f);
        Vector3 pBb = new Vector3(0f, bbY, bbZ);
        Vector3 pSelimBase = new Vector3(0f, selimY, selimZ);

        Transform headTube = Peca(PrimitiveType.Cylinder, "Quadro_HeadTube", raiz, Vector3.Lerp(pHeadBot, pHeadTop, 0.5f), new Vector3(0.042f, Vector3.Distance(pHeadBot, pHeadTop) * 0.52f, 0.042f), cPrim, 0.78f);
        headTube.rotation = Quaternion.FromToRotation(Vector3.up, (pHeadTop - pHeadBot).normalized);

        Transform seatTube = Peca(PrimitiveType.Cylinder, "Quadro_SeatTube", raiz, Vector3.Lerp(pBb, pSelimBase, 0.5f), new Vector3(0.034f, Vector3.Distance(pBb, pSelimBase) * 0.52f, 0.034f), cPrim, 0.78f);
        seatTube.rotation = Quaternion.FromToRotation(Vector3.up, (pSelimBase - pBb).normalized);

        Transform downTube = Peca(PrimitiveType.Cylinder, "Quadro_DownTube", raiz, Vector3.Lerp(pHeadBot, pBb, 0.5f), new Vector3(0.038f, Vector3.Distance(pHeadBot, pBb) * 0.52f, 0.038f), cPrim, 0.78f);
        downTube.rotation = Quaternion.FromToRotation(Vector3.up, (pBb - pHeadBot).normalized);

        Vector3 topAnchor = ehCesta ? Vector3.Lerp(pBb, pSelimBase, 0.38f) : pSelimBase;
        Transform topTube = Peca(PrimitiveType.Cylinder, "Quadro_TopTube", raiz, Vector3.Lerp(pHeadTop, topAnchor, 0.5f), new Vector3(0.032f, Vector3.Distance(pHeadTop, topAnchor) * 0.52f, 0.032f), cPrim, 0.78f);
        topTube.rotation = Quaternion.FromToRotation(Vector3.up, (topAnchor - pHeadTop).normalized);

        for (int s = -1; s <= 1; s += 2)
        {
            Vector3 pDrop = new Vector3(s * 0.056f, r, zT);
            Transform cs = Peca(PrimitiveType.Cylinder, s < 0 ? "Chainstay_E" : "Chainstay_D", raiz, Vector3.Lerp(pBb, pDrop, 0.5f), new Vector3(0.020f, Vector3.Distance(pBb, pDrop) * 0.52f, 0.020f), cPrim, 0.75f);
            cs.rotation = Quaternion.FromToRotation(Vector3.up, (pDrop - pBb).normalized);
            Transform ss = Peca(PrimitiveType.Cylinder, s < 0 ? "Seatstay_E" : "Seatstay_D", raiz, Vector3.Lerp(pSelimBase, pDrop, 0.5f), new Vector3(0.018f, Vector3.Distance(pSelimBase, pDrop) * 0.52f, 0.018f), cPrim, 0.75f);
            ss.rotation = Quaternion.FromToRotation(Vector3.up, (pDrop - pSelimBase).normalized);

            if (temPegs)
                Peca(PrimitiveType.Cylinder, s < 0 ? "Peg_Tras_E" : "Peg_Tras_D", raiz, new Vector3(s * 0.105f, r, zT), new Vector3(0.036f, 0.048f, 0.036f), cEscuro, 0.5f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
        }

        // Canote + Selim
        float postH = ehBmx ? 0.065f : (ehSpeed ? 0.12f : 0.16f);
        Peca(PrimitiveType.Cylinder, "Canote", raiz, new Vector3(0f, selimY + postH * 0.5f, selimZ - 0.015f), new Vector3(0.026f, postH * 0.52f, 0.026f), ehCesta ? cCromo : cEscuro, 0.8f);
        Peca(PrimitiveType.Cube, "Assento", raiz, new Vector3(0f, selimY + postH + 0.02f, selimZ - 0.02f), new Vector3(ehCesta ? 0.18f : 0.12f, 0.045f, 0.25f), ehCesta ? cSec : cEscuro, 0.25f);

        // Corrente superior/inferior + Pedivela Animado & Pedais Contra-Rotativos
        Transform chainTop = Peca(PrimitiveType.Cylinder, "Corrente_Sup", raiz, Vector3.Lerp(new Vector3(0.036f, bbY + 0.07f, bbZ), new Vector3(0.034f, r + 0.03f, zT), 0.5f), new Vector3(0.009f, Vector3.Distance(pBb, new Vector3(0.034f, r, zT)) * 0.5f, 0.009f), cEscuro, 0.5f);
        chainTop.rotation = Quaternion.FromToRotation(Vector3.up, (new Vector3(0.034f, r + 0.03f, zT) - new Vector3(0.036f, bbY + 0.07f, bbZ)).normalized);

        GameObject pedivelaGo = new GameObject("Pedivela_Pivo");
        pedivelaGo.transform.SetParent(raiz, false);
        pedivelaGo.transform.localPosition = pBb;
        ctrl.pedivelaPivo = pedivelaGo.transform;

        Peca(PrimitiveType.Cylinder, "Coroa_Bike", pedivelaGo.transform, new Vector3(0.036f, 0f, 0f), new Vector3(0.15f, 0.008f, 0.15f), cAro, 0.85f)
            .localRotation = Quaternion.Euler(0f, 0f, 90f);
        for (int s = -1; s <= 1; s += 2)
        {
            float crankLen = 0.165f;
            Peca(PrimitiveType.Cube, s < 0 ? "Braco_Pedivela_E" : "Braco_Pedivela_D", pedivelaGo.transform, new Vector3(s * 0.064f, s * crankLen * 0.5f, 0f), new Vector3(0.018f, crankLen, 0.024f), cCromo, 0.82f);
            GameObject pedalPivo = new GameObject(s < 0 ? "Pedal_E" : "Pedal_D");
            pedalPivo.transform.SetParent(pedivelaGo.transform, false);
            pedalPivo.transform.localPosition = new Vector3(s * 0.10f, s * crankLen, 0f);
            Peca(PrimitiveType.Cube, "Plataforma_Pedal", pedalPivo.transform, Vector3.zero, new Vector3(0.085f, 0.02f, 0.07f), cEscuro, 0.25f);
            ctrl.pedais.Add(pedalPivo.transform);
        }

        // Conjunto Dianteiro Esterçante (Mesa, Garfo, Guidão, Roda Dianteira, Cesta Dianteira)
        GameObject rigSteer = new GameObject("Rig_Esterco_Bike");
        rigSteer.transform.SetParent(raiz, false);
        rigSteer.transform.localPosition = pHeadTop;
        rigSteer.transform.localRotation = Quaternion.FromToRotation(Vector3.up, (pHeadTop - pHeadBot).normalized);

        GameObject pivoGuidao = new GameObject("Pivo_Guidao");
        pivoGuidao.transform.SetParent(rigSteer.transform, false);
        ctrl.guidaoPivo = pivoGuidao.transform;

        Vector3 headBotLocal = rigSteer.transform.InverseTransformPoint(raiz.TransformPoint(pHeadBot));
        Vector3 frontAxleLocal = rigSteer.transform.InverseTransformPoint(raiz.TransformPoint(new Vector3(0f, r, zF)));

        for (int s = -1; s <= 1; s += 2)
        {
            Vector3 gTop = new Vector3(s * 0.054f, headBotLocal.y, 0f);
            Vector3 gBot = new Vector3(s * 0.054f, frontAxleLocal.y, frontAxleLocal.z);
            Transform leg = Peca(PrimitiveType.Cylinder, s < 0 ? "Garfo_Bike_E" : "Garfo_Bike_D", pivoGuidao.transform, Vector3.Lerp(gTop, gBot, 0.5f), new Vector3(0.026f, Vector3.Distance(gTop, gBot) * 0.52f, 0.026f), cPrim, 0.78f);
            leg.localRotation = Quaternion.FromToRotation(Vector3.up, (gBot - gTop).normalized);
            if (temPegs)
                Peca(PrimitiveType.Cylinder, s < 0 ? "Peg_Frente_E" : "Peg_Frente_D", pivoGuidao.transform, new Vector3(s * 0.105f, frontAxleLocal.y, frontAxleLocal.z), new Vector3(0.036f, 0.048f, 0.036f), cEscuro, 0.5f)
                    .localRotation = Quaternion.Euler(0f, 0f, 90f);
        }

        float stemH = ehBmx ? 0.055f : (ehCesta ? 0.145f : 0.05f);
        float stemReach = ehSpeed ? 0.10f : 0.045f;
        float barW = Mathf.Max(0.40f, d.larg * 0.92f);
        Peca(PrimitiveType.Cylinder, "Mesa_Stem_Bike", pivoGuidao.transform, new Vector3(0f, stemH * 0.5f, stemReach * 0.35f), new Vector3(0.028f, stemH * 0.6f, 0.028f), cEscuro, 0.75f);
        Transform barraGuidao = Peca(PrimitiveType.Cylinder, "Guidao_Bike", pivoGuidao.transform, new Vector3(0f, stemH + (ehBmx ? 0.18f : 0.01f), stemReach), new Vector3(0.022f, barW * 0.5f, 0.022f), ehBmx || ehSpeed ? cEscuro : cCromo, 0.8f);
        barraGuidao.localRotation = Quaternion.Euler(0f, 0f, 90f);
        if (ehBmx)
        {
            Peca(PrimitiveType.Cylinder, "Crossbar_BMX", pivoGuidao.transform, new Vector3(0f, stemH + 0.13f, stemReach), new Vector3(0.018f, barW * 0.34f, 0.018f), cPrim, 0.7f)
                .localRotation = Quaternion.Euler(0f, 0f, 90f);
        }
        if (ehCesta)
        {
            Vector3 basketLocal = rigSteer.transform.InverseTransformPoint(raiz.TransformPoint(new Vector3(0f, r * 2f + 0.175f, zF - 0.02f)));
            Peca(PrimitiveType.Cube, "Cesta_Dianteira", pivoGuidao.transform, basketLocal, new Vector3(0.28f, 0.18f, 0.22f), cSec, 0.35f);
        }
        if (temBagageiro)
        {
            Peca(PrimitiveType.Cube, "Bagageiro_Bike", raiz, new Vector3(0f, r * 2f + 0.075f, zT), new Vector3(0.14f, 0.02f, 0.34f), cCromo, 0.8f);
            Peca(PrimitiveType.Cube, "Cesta_Traseira", raiz, new Vector3(0f, r * 2f + 0.165f, zT), new Vector3(0.26f, 0.15f, 0.32f), cSec, 0.35f);
        }

        Transform farolBike = PecaEmissiva(PrimitiveType.Cylinder, "Farol_Bike", pivoGuidao.transform, new Vector3(0f, stemH + 0.02f, stemReach + 0.03f), new Vector3(0.055f, 0.03f, 0.055f));
        farolBike.localRotation = Quaternion.Euler(90f, 0f, 0f);
        ctrl.farois.Add(farolBike.GetComponent<Renderer>());

        // Roda Dianteira alinhada horizontalmente dentro de pivoGuidao
        GameObject alignF = new GameObject("Roda_Frente_Alinhamento");
        alignF.transform.SetParent(pivoGuidao.transform, false);
        alignF.transform.localPosition = frontAxleLocal;
        alignF.transform.localRotation = Quaternion.Inverse(rigSteer.transform.localRotation);
        ctrl.rodasDianteiras.Add(CriarRoda(alignF.transform, "Roda_Dianteira", Vector3.zero, r, d.largRoda, cPneu, cAro, cDest));
    }

    private static void MontarBarco(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cVidro)
    {
        Color cCromo = new Color(0.90f, 0.92f, 0.95f);
        Color cTeca = new Color(0.56f, 0.36f, 0.20f);
        Color cEscuro = new Color(0.12f, 0.14f, 0.17f);
        Color cBorracha = new Color(0.18f, 0.20f, 0.23f);

        float hullH = d.arquetipo == "jetski" ? d.alt * 0.48f : (d.arquetipo == "yacht" ? d.alt * 0.34f : d.alt * 0.44f);
        float deckY = hullH * 0.92f;
        float floorY = hullH * 0.42f;
        float hl = d.comp * 0.5f;

        if (d.arquetipo == "jetski")
        {
            // Casco V escalonado com proa afilada
            Peca(PrimitiveType.Cube, "Quilha_Jetski", raiz, new Vector3(0f, hullH * 0.34f, -d.comp * 0.06f), new Vector3(d.larg * 0.78f, hullH * 0.55f, d.comp * 0.68f), cPrim, 0.80f);
            Peca(PrimitiveType.Cube, "Casco_Superior_Jetski", raiz, new Vector3(0f, hullH * 0.68f, -d.comp * 0.04f), new Vector3(d.larg * 0.94f, hullH * 0.34f, d.comp * 0.66f), cPrim, 0.82f);
            Transform proa = Peca(PrimitiveType.Cube, "Proa_Jetski", raiz, new Vector3(0f, hullH * 0.56f, d.comp * 0.29f), new Vector3(d.larg * 0.62f, hullH * 0.42f, d.comp * 0.32f), cPrim, 0.82f);
            proa.localRotation = Quaternion.Euler(0f, 45f, 0f);

            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cube, s < 0 ? "Friso_Bombo_E" : "Friso_Bombo_D", raiz, new Vector3(s * d.larg * 0.48f, hullH * 0.64f, -d.comp * 0.04f), new Vector3(0.06f, 0.07f, d.comp * 0.72f), cDest, 0.65f);

            // Capô dianteiro articulado
            Transform capot = CriarPivoArticulado(raiz, "Capo_Proa_Jetski", new Vector3(0f, hullH * 0.86f, d.comp * 0.14f), new Vector3(-42f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Tampa_Jetski", capot, new Vector3(0f, 0.02f, d.comp * 0.14f), new Vector3(d.larg * 0.50f, 0.09f, d.comp * 0.28f), cDest, 0.78f);

            // Banco esportivo articulado (acesso ao motor)
            Transform pivoBanco = CriarPivoArticulado(raiz, "Banco_Motor_Jetski", new Vector3(0f, hullH * 0.90f, -d.comp * 0.04f), new Vector3(-48f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Assento_Jetski", pivoBanco, new Vector3(0f, 0.08f, -d.comp * 0.16f), new Vector3(d.larg * 0.34f, 0.18f, d.comp * 0.36f), cSec, 0.32f);

            // Defletor de acrílico + coluna de direção + guidão conectado + retrovisores
            Transform defl = Peca(PrimitiveType.Cube, "Parabrisa_Jetski", raiz, new Vector3(0f, hullH * 1.12f, d.comp * 0.15f), new Vector3(d.larg * 0.44f, 0.22f, 0.04f), cVidro, 0.92f);
            defl.localRotation = Quaternion.Euler(-38f, 0f, 0f);
            Peca(PrimitiveType.Cylinder, "Coluna_Guidao_Jetski", raiz, new Vector3(0f, hullH * 1.05f, d.comp * 0.09f), new Vector3(0.045f, 0.14f, 0.045f), cEscuro, 0.45f)
                .localRotation = Quaternion.Euler(-22f, 0f, 0f);
            Transform guidao = Peca(PrimitiveType.Cylinder, "Guidao_Jetski", raiz, new Vector3(0f, hullH * 1.18f, d.comp * 0.06f), new Vector3(0.036f, d.larg * 0.34f, 0.036f), cCromo, 0.88f);
            guidao.localRotation = Quaternion.Euler(0f, 0f, 90f);

            Transform jato = Peca(PrimitiveType.Cylinder, "Turbina_Hidrojato", raiz, new Vector3(0f, hullH * 0.36f, -hl - 0.08f), new Vector3(0.22f, 0.14f, 0.22f), cEscuro, 0.75f);
            jato.localRotation = Quaternion.Euler(90f, 0f, 0f);
            Transform helJet = Peca(PrimitiveType.Cube, "Impulsor_Hidrojato", raiz, new Vector3(0f, hullH * 0.36f, -hl - 0.16f), new Vector3(0.16f, 0.04f, 0.03f), cDest, 0.85f);
            ctrl.helices.Add(helJet);
            return;
        }

        // 1. Casco em V multi-seção com poço vazado (cockpit real) para todos os barcos
        float beamHull = d.arquetipo == "rib_boat" ? d.larg * 0.72f : d.larg;
        Peca(PrimitiveType.Cube, "Quilha_Fundo", raiz, new Vector3(0f, hullH * 0.22f, -d.comp * 0.08f), new Vector3(beamHull * 0.72f, hullH * 0.42f, d.comp * 0.70f), cPrim, 0.78f);
        Peca(PrimitiveType.Cube, "Piso_Cockpit", raiz, new Vector3(0f, floorY, -d.comp * 0.10f), new Vector3(beamHull * 0.82f, 0.08f, d.comp * 0.60f), d.arquetipo == "tugboat" ? cSec : cTeca, 0.30f);

        // Costados laterais vazados (deixando o interior livre)
        for (int s = -1; s <= 1; s += 2)
        {
            Peca(PrimitiveType.Cube, s < 0 ? "Costado_Popa_E" : "Costado_Popa_D", raiz,
                new Vector3(s * beamHull * 0.44f, hullH * 0.64f, -d.comp * 0.12f),
                new Vector3(beamHull * 0.12f, hullH * 0.56f, d.comp * 0.58f), cPrim, 0.78f);
            Peca(PrimitiveType.Cube, s < 0 ? "Costado_Proa_E" : "Costado_Proa_D", raiz,
                new Vector3(s * beamHull * 0.28f, hullH * 0.64f, d.comp * 0.26f),
                new Vector3(beamHull * 0.12f, hullH * 0.56f, d.comp * 0.28f), cPrim, 0.78f)
                .localRotation = Quaternion.Euler(0f, s * -22f, 0f);
            Peca(PrimitiveType.Cube, s < 0 ? "Faixa_Casco_E" : "Faixa_Casco_D", raiz,
                new Vector3(s * beamHull * 0.50f, hullH * 0.78f, -d.comp * 0.10f),
                new Vector3(0.04f, 0.09f, d.comp * 0.62f), cDest, 0.70f);
        }

        // Proa afilada e convés de proa
        Transform bicoProa = Peca(PrimitiveType.Cube, "Proa_Afilada", raiz, new Vector3(0f, hullH * 0.54f, d.comp * 0.38f), new Vector3(beamHull * 0.50f, hullH * 0.68f, d.comp * 0.24f), cPrim, 0.78f);
        bicoProa.localRotation = Quaternion.Euler(0f, 45f, 0f);
        Peca(PrimitiveType.Cube, "Conves_Proa", raiz, new Vector3(0f, deckY * 0.94f, d.comp * 0.26f), new Vector3(beamHull * 0.78f, 0.10f, d.comp * 0.28f), d.arquetipo == "tugboat" ? cSec : cTeca, 0.35f);

        // Espelho de popa com passagem e plataforma de mergulho
        Peca(PrimitiveType.Cube, "Espelho_Popa_E", raiz, new Vector3(-beamHull * 0.28f, hullH * 0.64f, -d.comp * 0.42f), new Vector3(beamHull * 0.40f, hullH * 0.56f, 0.12f), cPrim, 0.76f);
        Peca(PrimitiveType.Cube, "Plataforma_Popa", raiz, new Vector3(0f, hullH * 0.38f, -hl + 0.14f), new Vector3(beamHull * 0.84f, 0.08f, 0.42f), cTeca, 0.30f);

        // Guarda-mancebo de proa (corrimão inox)
        for (int s = -1; s <= 1; s += 2)
        {
            Peca(PrimitiveType.Cylinder, s < 0 ? "Balaustre_Proa_E" : "Balaustre_Proa_D", raiz,
                new Vector3(s * beamHull * 0.30f, deckY + 0.14f, d.comp * 0.26f), new Vector3(0.03f, 0.14f, 0.03f), cCromo, 0.88f);
            Transform guarda = Peca(PrimitiveType.Cylinder, s < 0 ? "Guarda_Mancebo_E" : "Guarda_Mancebo_D", raiz,
                new Vector3(s * beamHull * 0.20f, deckY + 0.26f, d.comp * 0.34f), new Vector3(0.03f, d.comp * 0.16f, 0.03f), cCromo, 0.88f);
            guarda.localRotation = Quaternion.Euler(90f, s * -26f, 0f);
        }

        // Portão de popa articulado (comum a embarcações de passeio/resgate)
        Transform portaoPopa = CriarPivoArticulado(raiz, "Portao_Popa",
            new Vector3(beamHull * 0.36f, hullH * 0.66f, -d.comp * 0.42f),
            new Vector3(0f, 82f, 0f), Vector3.zero, ctrl);
        Peca(PrimitiveType.Cube, "Folha_Portao_Popa", portaoPopa, new Vector3(-beamHull * 0.16f, 0f, 0f), new Vector3(beamHull * 0.32f, hullH * 0.48f, 0.07f), cSec, 0.65f);

        if (d.arquetipo == "rib_boat")
        {
            // Tubulões infláveis laterais e de proa
            for (int s = -1; s <= 1; s += 2)
            {
                Transform tubo = Peca(PrimitiveType.Cylinder, s < 0 ? "Tubulao_E" : "Tubulao_D", raiz,
                    new Vector3(s * d.larg * 0.40f, hullH * 0.72f, -d.comp * 0.08f),
                    new Vector3(d.larg * 0.24f, d.comp * 0.34f, d.larg * 0.24f), cPrim, 0.35f);
                tubo.localRotation = Quaternion.Euler(90f, 0f, 0f);
                Transform tuboProa = Peca(PrimitiveType.Cylinder, s < 0 ? "Tubulao_Proa_E" : "Tubulao_Proa_D", raiz,
                    new Vector3(s * d.larg * 0.22f, hullH * 0.78f, d.comp * 0.30f),
                    new Vector3(d.larg * 0.22f, d.comp * 0.18f, d.larg * 0.22f), cPrim, 0.35f);
                tuboProa.localRotation = Quaternion.Euler(82f, s * -28f, 0f);
            }
            // Console jockey + para-brisa com moldura
            Peca(PrimitiveType.Cube, "Console_Jockey", raiz, new Vector3(0f, floorY + 0.45f, 0.08f), new Vector3(d.larg * 0.34f, 0.86f, 0.72f), cSec, 0.55f);
            Transform pbRib = Peca(PrimitiveType.Cube, "Parabrisa_RIB", raiz, new Vector3(0f, floorY + 1.02f, 0.32f), new Vector3(d.larg * 0.34f, 0.42f, 0.05f), cVidro, 0.92f);
            pbRib.localRotation = Quaternion.Euler(-32f, 0f, 0f);

            // Escotilha de proa + porta do console
            Transform escRib = CriarPivoArticulado(raiz, "Escotilha_Proa_RIB", new Vector3(0f, deckY + 0.02f, d.comp * 0.22f), new Vector3(-56f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Tampa_Escotilha_RIB", escRib, new Vector3(0f, 0.03f, 0.22f), new Vector3(d.larg * 0.28f, 0.06f, 0.44f), cSec, 0.6f);
            Transform portaCons = CriarPivoArticulado(raiz, "Porta_Console_RIB", new Vector3(-d.larg * 0.17f, floorY + 0.44f, 0.08f), new Vector3(0f, -76f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Folha_Porta_Console", portaCons, new Vector3(0.02f, 0f, -0.22f), new Vector3(0.04f, 0.62f, 0.44f), cDest, 0.6f);

            // Arco targa de resgate + giroflex
            Peca(PrimitiveType.Cube, "Arco_Resgate", raiz, new Vector3(0f, deckY + 0.92f, -d.comp * 0.30f), new Vector3(d.larg * 0.72f, 0.09f, 0.12f), cCromo, 0.85f);
            Transform gRib = PecaEmissiva(PrimitiveType.Cube, "Estrobo_Resgate", raiz, new Vector3(0f, deckY + 1.02f, -d.comp * 0.30f), new Vector3(0.24f, 0.10f, 0.12f));
            ctrl.giroflexAmbar.Add(gRib.GetComponent<Renderer>());
        }
        else if (d.arquetipo == "yacht")
        {
            // Vigias do casco
            for (int s = -1; s <= 1; s += 2)
                for (int i = -1; i <= 1; i++)
                    Peca(PrimitiveType.Cylinder, "Vigia_Casco", raiz, new Vector3(s * d.larg * 0.49f, hullH * 0.64f, i * d.comp * 0.12f), new Vector3(0.24f, 0.04f, 0.16f), cVidro, 0.95f)
                        .localRotation = Quaternion.Euler(0f, 0f, 90f);

            // Escotilha de proa articulada
            Transform escProa = CriarPivoArticulado(raiz, "Escotilha_Proa_Iate", new Vector3(0f, deckY + 0.02f, d.comp * 0.24f), new Vector3(-54f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Tampa_Proa_Iate", escProa, new Vector3(0f, 0.04f, 0.28f), new Vector3(d.larg * 0.26f, 0.06f, 0.56f), cVidro, 0.9f);

            // Salão principal com teto, para-brisa inclinado e janelas laterais embutidas
            float salonY = deckY + 0.56f;
            float salonH = d.alt * 0.28f;
            Peca(PrimitiveType.Cube, "Teto_Salao", raiz, new Vector3(0f, salonY + salonH * 0.52f, -d.comp * 0.04f), new Vector3(d.larg * 0.82f, 0.10f, d.comp * 0.48f), cSec, 0.78f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Janela_Salao_E" : "Janela_Salao_D", raiz, new Vector3(s * d.larg * 0.39f, salonY, -d.comp * 0.04f), new Vector3(0.05f, salonH * 0.72f, d.comp * 0.40f), cVidro, 0.94f);
                Peca(PrimitiveType.Cube, s < 0 ? "Coluna_Salao_E" : "Coluna_Salao_D", raiz, new Vector3(s * d.larg * 0.40f, salonY, -d.comp * 0.25f), new Vector3(0.10f, salonH, 0.14f), cSec, 0.75f);
            }
            Transform pbYacht = Peca(PrimitiveType.Cube, "Parabrisa_Iate", raiz, new Vector3(0f, salonY + 0.06f, d.comp * 0.18f), new Vector3(d.larg * 0.74f, salonH * 0.78f, 0.06f), cVidro, 0.94f);
            pbYacht.localRotation = Quaternion.Euler(-28f, 0f, 0f);

            // Sofá em L e posto de comando no salão
            Peca(PrimitiveType.Cube, "Sofa_Salao", raiz, new Vector3(-d.larg * 0.16f, floorY + 0.26f, -d.comp * 0.10f), new Vector3(d.larg * 0.34f, 0.42f, d.comp * 0.24f), cDest, 0.30f);
            Peca(PrimitiveType.Cube, "Console_Salao", raiz, new Vector3(d.larg * 0.16f, floorY + 0.46f, d.comp * 0.08f), new Vector3(d.larg * 0.26f, 0.72f, 0.56f), cEscuro, 0.60f);

            // Portas corrediças duplas do salão (articuladas)
            for (int s = -1; s <= 1; s += 2)
            {
                Transform portaSalao = CriarPivoArticulado(raiz, s < 0 ? "Porta_Salao_E" : "Porta_Salao_D",
                    new Vector3(s * d.larg * 0.14f, deckY + salonH * 0.45f, -d.comp * 0.27f),
                    Vector3.zero, new Vector3(s * d.larg * 0.20f, 0f, 0.04f), ctrl);
                Peca(PrimitiveType.Cube, "Vidro_Porta_Salao", portaSalao, Vector3.zero, new Vector3(d.larg * 0.26f, salonH * 0.80f, 0.05f), cVidro, 0.94f);
            }

            // Flybridge superior + arco radar + radome
            float flyY = salonY + salonH * 0.58f;
            Peca(PrimitiveType.Cube, "Console_Flybridge", raiz, new Vector3(0f, flyY + 0.34f, 0.16f), new Vector3(d.larg * 0.44f, 0.56f, 0.62f), cSec, 0.72f);
            Peca(PrimitiveType.Cube, "Sofa_Flybridge", raiz, new Vector3(0f, flyY + 0.20f, -d.comp * 0.12f), new Vector3(d.larg * 0.58f, 0.34f, 0.68f), cDest, 0.30f);
            Peca(PrimitiveType.Cube, "Arco_Radar", raiz, new Vector3(0f, flyY + 0.88f, -d.comp * 0.12f), new Vector3(d.larg * 0.72f, 0.12f, 0.22f), cSec, 0.78f);
            Peca(PrimitiveType.Cylinder, "Radome", raiz, new Vector3(0f, flyY + 1.04f, -d.comp * 0.12f), new Vector3(0.46f, 0.12f, 0.46f), cCromo, 0.85f);
        }
        else if (d.arquetipo == "tugboat")
        {
            // Defensas de borracha ao redor do casco + cabeça-de-bitta de reboque
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cube, s < 0 ? "Defensa_E" : "Defensa_D", raiz, new Vector3(s * d.larg * 0.52f, hullH * 0.76f, 0f), new Vector3(0.12f, 0.20f, d.comp * 0.84f), cBorracha, 0.20f);
            Peca(PrimitiveType.Cube, "Cabeca_Reboque_H", raiz, new Vector3(0f, floorY + 0.48f, -d.comp * 0.26f), new Vector3(0.75f, 0.14f, 0.14f), cCromo, 0.70f);

            // Escotilha da casa de máquinas articulada
            Transform escMaq = CriarPivoArticulado(raiz, "Escotilha_Maquinas", new Vector3(0f, floorY + 0.08f, -d.comp * 0.12f), new Vector3(-52f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Tampa_Maquinas", escMaq, new Vector3(0f, 0.05f, -0.35f), new Vector3(d.larg * 0.36f, 0.10f, 0.70f), cDest, 0.5f);

            // Casaria de comando (2 níveis) + janelas + chaminés
            float cabY = deckY + 0.62f;
            Peca(PrimitiveType.Cube, "Casaria_Base", raiz, new Vector3(0f, cabY, d.comp * 0.04f), new Vector3(d.larg * 0.66f, 1.15f, d.comp * 0.36f), cSec, 0.60f);
            Peca(PrimitiveType.Cube, "Ponte_Comando", raiz, new Vector3(0f, cabY + 0.96f, d.comp * 0.08f), new Vector3(d.larg * 0.54f, 0.78f, d.comp * 0.26f), cVidro, 0.92f);
            Peca(PrimitiveType.Cube, "Teto_Ponte", raiz, new Vector3(0f, cabY + 1.42f, d.comp * 0.08f), new Vector3(d.larg * 0.60f, 0.10f, d.comp * 0.30f), cDest, 0.65f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cylinder, s < 0 ? "Chamine_E" : "Chamine_D", raiz, new Vector3(s * d.larg * 0.22f, cabY + 0.95f, -d.comp * 0.12f), new Vector3(0.32f, 0.68f, 0.32f), cDest, 0.45f);
                Transform portaPonte = CriarPivoArticulado(raiz, s < 0 ? "Porta_Ponte_E" : "Porta_Ponte_D",
                    new Vector3(s * d.larg * 0.34f, cabY - 0.08f, d.comp * 0.14f),
                    new Vector3(0f, s * -76f, 0f), Vector3.zero, ctrl);
                Peca(PrimitiveType.Cube, "Folha_Porta_Ponte", portaPonte, new Vector3(0f, 0f, -0.32f), new Vector3(0.06f, 0.92f, 0.64f), cPrim, 0.65f);
            }
        }
        else
        {
            // Speedboat (Ipanema / Lancha Offshore Cigarra V12)
            // Para-brisa envolvente em 3 peças + moldura
            Transform pbCentral = Peca(PrimitiveType.Cube, "Parabrisa_Central", raiz, new Vector3(0f, deckY + 0.20f, d.comp * 0.12f), new Vector3(d.larg * 0.68f, 0.40f, 0.05f), cVidro, 0.94f);
            pbCentral.localRotation = Quaternion.Euler(-38f, 0f, 0f);
            for (int s = -1; s <= 1; s += 2)
            {
                Transform pbLat = Peca(PrimitiveType.Cube, s < 0 ? "Parabrisa_E" : "Parabrisa_D", raiz, new Vector3(s * d.larg * 0.39f, deckY + 0.18f, d.comp * 0.02f), new Vector3(0.04f, 0.36f, d.comp * 0.18f), cVidro, 0.94f);
                pbLat.localRotation = Quaternion.Euler(0f, s * 16f, 0f);
            }

            // Console de comando + volante + bancos + sofá de popa
            Peca(PrimitiveType.Cube, "Console_Leme", raiz, new Vector3(d.larg * 0.18f, floorY + 0.42f, d.comp * 0.05f), new Vector3(d.larg * 0.32f, 0.72f, 0.56f), cSec, 0.65f);
            Transform volante = Peca(PrimitiveType.Cylinder, "Timao_Lancha", raiz, new Vector3(d.larg * 0.18f, floorY + 0.68f, -0.02f), new Vector3(0.28f, 0.04f, 0.28f), cCromo, 0.88f);
            volante.localRotation = Quaternion.Euler(65f, 0f, 0f);
            Peca(PrimitiveType.Cube, "Banco_Piloto", raiz, new Vector3(d.larg * 0.19f, floorY + 0.32f, -d.comp * 0.10f), new Vector3(0.46f, 0.56f, 0.46f), cDest, 0.32f);
            Peca(PrimitiveType.Cube, "Banco_Copiloto", raiz, new Vector3(-d.larg * 0.19f, floorY + 0.32f, -d.comp * 0.10f), new Vector3(0.46f, 0.56f, 0.46f), cDest, 0.32f);
            Peca(PrimitiveType.Cube, "Sofa_Popa", raiz, new Vector3(0f, floorY + 0.24f, -d.comp * 0.29f), new Vector3(d.larg * 0.74f, 0.38f, 0.48f), cDest, 0.32f);

            // Escotilha de proa + porta da cabine + capô solário do motor (articulados)
            Transform escProa = CriarPivoArticulado(raiz, "Escotilha_Proa", new Vector3(0f, deckY + 0.04f, d.comp * 0.24f), new Vector3(-56f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Tampa_Escotilha_Proa", escProa, new Vector3(0f, 0.03f, 0.24f), new Vector3(d.larg * 0.28f, 0.06f, 0.48f), cVidro, 0.90f);

            Transform portaCab = CriarPivoArticulado(raiz, "Porta_Cabine_Barco", new Vector3(-d.larg * 0.22f, floorY + 0.42f, d.comp * 0.08f), new Vector3(0f, -76f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Folha_Porta_Cabine", portaCab, new Vector3(d.larg * 0.14f, 0f, 0f), new Vector3(d.larg * 0.28f, 0.78f, 0.06f), cSec, 0.65f);

            Transform capoMotor = CriarPivoArticulado(raiz, "Capo_Solario_Motor", new Vector3(0f, hullH * 0.88f, -d.comp * 0.26f), new Vector3(48f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Solario_Popa", capoMotor, new Vector3(0f, 0.06f, -d.comp * 0.09f), new Vector3(d.larg * 0.68f, 0.12f, d.comp * 0.22f), cDest, 0.35f);

            // T-top hardtop offshore em lanchas maiores
            if (d.comp >= 7.5f || d.extras.Contains("t_top"))
            {
                for (int s = -1; s <= 1; s += 2)
                    Peca(PrimitiveType.Cylinder, s < 0 ? "Coluna_TTop_E" : "Coluna_TTop_D", raiz, new Vector3(s * d.larg * 0.32f, deckY + 0.54f, -d.comp * 0.06f), new Vector3(0.05f, 0.56f, 0.05f), cCromo, 0.88f);
                Peca(PrimitiveType.Cube, "Teto_TTop", raiz, new Vector3(0f, deckY + 1.12f, -d.comp * 0.06f), new Vector3(d.larg * 0.72f, 0.08f, d.comp * 0.28f), cSec, 0.75f);
            }
        }

        // Motores de popa duplos com hélices giratórias
        int numMotores = d.arquetipo == "rib_boat" ? 1 : 2;
        for (int m = 0; m < numMotores; m++)
        {
            float sx = numMotores == 1 ? 0f : (m == 0 ? -0.38f : 0.38f);
            Peca(PrimitiveType.Cube, "Motor_Popa_" + m, raiz, new Vector3(sx, hullH * 0.68f, -hl - 0.14f), new Vector3(0.30f, 0.56f, 0.38f), cEscuro, 0.70f);
            Peca(PrimitiveType.Cube, "Rabeta_Motor_" + m, raiz, new Vector3(sx, hullH * 0.34f, -hl - 0.18f), new Vector3(0.10f, 0.38f, 0.16f), cEscuro, 0.65f);
            Transform hel = Peca(PrimitiveType.Cube, "Helice_Popa_" + m, raiz, new Vector3(sx, hullH * 0.18f, -hl - 0.30f), new Vector3(0.34f, 0.08f, 0.04f), cDest, 0.85f);
            ctrl.helices.Add(hel);
        }
    }

    private static void MontarHovercraft(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cVidro)
    {
        // Saia inflável
        Peca(PrimitiveType.Cube, "Saia_Inflavel", raiz, new Vector3(0f, 0.24f, 0f), new Vector3(d.larg, 0.44f, d.comp), cSec, 0.2f);
        // Convés
        Peca(PrimitiveType.Cube, "Conves_Hover", raiz, new Vector3(0f, 0.54f, 0f), new Vector3(d.larg * 0.90f, 0.22f, d.comp * 0.90f), cPrim, 0.75f);
        // Cabine avançada
        Peca(PrimitiveType.Cube, "Cabine_Hover", raiz, new Vector3(0f, 1.15f, d.comp * 0.12f), new Vector3(d.larg * 0.64f, 0.95f, d.comp * 0.46f), cVidro, 0.92f);
        // Dutos + hélices traseiras
        for (int s = -1; s <= 1; s += 2)
        {
            Transform duto = Peca(PrimitiveType.Cylinder, "Duto_Turbina", raiz, new Vector3(s * d.larg * 0.26f, 1.25f, -d.comp * 0.34f), new Vector3(1.1f, 0.28f, 1.1f), cSec, 0.5f);
            duto.localRotation = Quaternion.Euler(90f, 0f, 0f);
            Transform hel = Peca(PrimitiveType.Cube, "Helice_Hover", raiz, new Vector3(s * d.larg * 0.26f, 1.25f, -d.comp * 0.36f), new Vector3(0.95f, 0.12f, 0.04f), cDest, 0.85f);
            ctrl.helices.Add(hel);
        }
    }

    private static void MontarHelicoptero(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cVidro, Color cPneu, Color cAro)
    {
        bool ehApache = d.codigo == "VHC-98";
        bool ehStealth = d.codigo == "VHC-99";
        bool ehSkycrane = d.codigo == "VHC-100";
        bool ehVIP = d.codigo == "VHC-97";
        bool ehResgate = d.codigo == "VHC-49";
        bool ehPolicia = d.codigo == "VHC-48";

        float fuseW = ehApache ? Mathf.Min(1.36f, d.larg * 0.36f) : (ehSkycrane ? Mathf.Min(1.96f, d.larg * 0.64f) : Mathf.Min(2.08f, d.larg * 0.72f));
        float cabBaseY = ehSkycrane ? d.vao + 0.84f : d.vao + 0.24f;
        float cabH = ehApache ? d.alt * 0.38f : (ehSkycrane ? d.alt * 0.36f : d.alt * 0.46f);
        float fuseLen = d.comp * (ehApache ? 0.50f : (ehSkycrane ? 0.42f : 0.48f));
        float cabCenterZ = d.comp * (ehSkycrane ? 0.14f : 0.08f);
        float cabFrontZ = cabCenterZ + fuseLen * 0.5f;
        float cabRearZ = cabCenterZ - fuseLen * 0.5f;
        float cowlY = cabBaseY + cabH * (ehApache ? 0.42f : 0.40f);
        float roofY = cabBaseY + cabH;
        float hl = d.comp * 0.5f;
        Color cEscuro = new Color(0.14f, 0.15f, 0.18f);
        Color cCouro = new Color(0.24f, 0.22f, 0.21f);
        Color cCromo = new Color(0.88f, 0.90f, 0.92f);

        // 1. Fuselagem esculpida com cabine aberta e vão real de parabrisa (zero esfera gigante flutuando!)
        float cf = fuseLen * 0.5f;
        float floorH = Mathf.Max(0.14f, cabH * 0.13f);
        float cowlH = cowlY - cabBaseY;
        float wsBotZ = cabCenterZ + cf * (ehStealth || ehApache ? 0.78f : 0.72f);
        float wsTopZ = cabCenterZ + (ehApache ? -cf * 0.18f : cf * 0.20f);

        // Assoalho + bico frontal + parede traseira + teto estrutural
        Peca(PrimitiveType.Cube, "Assoalho_Cabine_Heli", raiz, new Vector3(0f, cabBaseY + floorH * 0.5f, cabCenterZ), new Vector3(fuseW * 0.86f, floorH, fuseLen * 0.94f), cPrim, 0.75f);
        Peca(PrimitiveType.Cube, "Bico_Aerodinamico_Heli", raiz, new Vector3(0f, cabBaseY + cowlH * 0.5f, cabFrontZ - fuseLen * 0.14f), new Vector3(fuseW * 0.82f, cowlH, fuseLen * 0.28f), cPrim, 0.76f);
        Peca(PrimitiveType.Cube, "Parede_Traseira_Cabine", raiz, new Vector3(0f, cabBaseY + cabH * 0.52f, cabRearZ + fuseLen * 0.18f), new Vector3(fuseW * 0.86f, cabH * 0.92f, fuseLen * 0.34f), cPrim, 0.75f);
        float roofSpineL = Mathf.Max(0.6f, wsTopZ - cabRearZ);
        Peca(PrimitiveType.Cube, "Teto_Estrutural_Heli", raiz, new Vector3(0f, roofY - 0.04f, (wsTopZ + cabRearZ) * 0.5f), new Vector3(fuseW * 0.78f, 0.12f, roofSpineL), cPrim, 0.75f);

        // Bochechas laterais e colunas traseiras + faixas
        for (int s = -1; s <= 1; s += 2)
        {
            Peca(PrimitiveType.Cube, s < 0 ? "Bochecha_E" : "Bochecha_D", raiz, new Vector3(s * fuseW * 0.435f, cabBaseY + cowlH * 0.48f, cabFrontZ - fuseLen * 0.16f), new Vector3(fuseW * 0.13f, cowlH * 0.92f, fuseLen * 0.32f), cPrim, 0.75f);
            Peca(PrimitiveType.Cube, s < 0 ? "Coluna_Traseira_Heli_E" : "Coluna_Traseira_Heli_D", raiz, new Vector3(s * fuseW * 0.435f, cabBaseY + cabH * 0.48f, cabRearZ + fuseLen * 0.17f), new Vector3(fuseW * 0.13f, cabH * 0.92f, fuseLen * 0.30f), cPrim, 0.75f);
            Peca(PrimitiveType.Cube, s < 0 ? "Faixa_Heli_E" : "Faixa_Heli_D", raiz, new Vector3(s * fuseW * 0.495f, cabBaseY + cowlH * 0.56f, cabCenterZ - fuseLen * 0.05f), new Vector3(0.03f, 0.08f, fuseLen * 0.72f), cDest, 0.7f);
        }

        // 2. Para-brisa embutido entre colunas A + montante central + janelas inferiores de queixo
        float wsTopY = roofY - 0.04f;
        float wsBotY = cowlY;
        float wsSpanZ = wsBotZ - wsTopZ;
        float wsSpanY = wsTopY - wsBotY;
        float wsLen = Mathf.Sqrt(wsSpanZ * wsSpanZ + wsSpanY * wsSpanY);
        float wsDeg = Mathf.Atan2(wsSpanZ, wsSpanY) * Mathf.Rad2Deg;

        Transform wsHeli = Peca(PrimitiveType.Cube, "Parabrisa_Panoramico_Heli", raiz, new Vector3(0f, (wsBotY + wsTopY) * 0.5f, (wsBotZ + wsTopZ) * 0.5f), new Vector3(fuseW * 0.78f, wsLen * 0.94f, 0.04f), cVidro, 0.95f);
        wsHeli.localRotation = Quaternion.Euler(-wsDeg, 0f, 0f);
        Transform mCentral = Peca(PrimitiveType.Cube, "Montante_Central_Parabrisa", raiz, new Vector3(0f, (wsBotY + wsTopY) * 0.5f, (wsBotZ + wsTopZ) * 0.5f + 0.01f), new Vector3(0.045f, wsLen * 0.96f, 0.05f), cEscuro, 0.45f);
        mCentral.localRotation = Quaternion.Euler(-wsDeg, 0f, 0f);
        for (int s = -1; s <= 1; s += 2)
        {
            Transform colA = Peca(PrimitiveType.Cube, s < 0 ? "Coluna_A_Heli_E" : "Coluna_A_Heli_D", raiz, new Vector3(s * fuseW * 0.40f, (wsBotY + wsTopY) * 0.5f, (wsBotZ + wsTopZ) * 0.5f), new Vector3(0.07f, wsLen, 0.08f), cPrim, 0.74f);
            colA.localRotation = Quaternion.Euler(-wsDeg, 0f, 0f);
            if (!ehApache && !ehStealth)
            {
                Transform chinW = Peca(PrimitiveType.Cube, s < 0 ? "Visor_Inferior_E" : "Visor_Inferior_D", raiz, new Vector3(s * fuseW * 0.22f, cabBaseY + cowlH * 0.54f, cabFrontZ - 0.02f), new Vector3(fuseW * 0.26f, cowlH * 0.42f, 0.04f), cVidro, 0.92f);
                chinW.localRotation = Quaternion.Euler(-40f, 0f, 0f);
            }
        }

        // 3. Interior visível (Bancos anatômicos, manche cíclico e console MFD)
        float seatFloorY = cabBaseY + floorH + 0.02f;
        float frontSeatZ = ehApache ? cabCenterZ + cf * 0.34f : cabCenterZ + cf * 0.22f;
        if (ehApache)
        {
            Peca(PrimitiveType.Cube, "Banco_Artilheiro", raiz, new Vector3(0f, seatFloorY + 0.24f, frontSeatZ + 0.35f), new Vector3(0.38f, 0.46f, 0.38f), cCouro, 0.35f);
            Peca(PrimitiveType.Cube, "Banco_Piloto_Elevado", raiz, new Vector3(0f, seatFloorY + 0.40f, frontSeatZ - 0.45f), new Vector3(0.38f, 0.46f, 0.38f), cCouro, 0.35f);
        }
        else
        {
            for (int s = -1; s <= 1; s += 2)
            {
                float sx = s * fuseW * 0.22f;
                Peca(PrimitiveType.Cube, s < 0 ? "Banco_Piloto_E" : "Banco_Piloto_D", raiz, new Vector3(sx, seatFloorY + 0.24f, frontSeatZ), new Vector3(0.36f, 0.46f, 0.38f), cCouro, 0.35f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Manche_E" : "Manche_D", raiz, new Vector3(sx, seatFloorY + 0.18f, frontSeatZ + 0.22f), new Vector3(0.03f, 0.18f, 0.03f), cEscuro, 0.4f);
            }
        }
        Peca(PrimitiveType.Cube, "Console_Avionica", raiz, new Vector3(0f, seatFloorY + 0.28f, wsBotZ - 0.16f), new Vector3(fuseW * 0.54f, 0.22f, 0.30f), cEscuro, 0.4f);
        Transform mfd = PecaEmissiva(PrimitiveType.Cube, "Tela_MFD_Heli", raiz, new Vector3(0f, seatFloorY + 0.31f, wsBotZ - 0.28f), new Vector3(fuseW * 0.40f, 0.11f, 0.04f));
        ctrl.farois.Add(mfd.GetComponent<Renderer>());

        // 4. Portas laterais articuladas (Apache com escotilhas à frente das asas)
        for (int s = -1; s <= 1; s += 2)
        {
            float dLen = fuseLen * (ehApache ? 0.28f : 0.34f);
            float dH = cabH * (ehApache ? 0.42f : 0.68f);
            Transform portaHeli = CriarPivoArticulado(
                raiz,
                ehApache ? (s < 0 ? "Escotilha_Apache_E" : "Escotilha_Apache_D") : (s < 0 ? "Porta_Corredica_E" : "Porta_Corredica_D"),
                new Vector3(s * fuseW * 0.46f, cabBaseY + floorH + dH * 0.52f, cabCenterZ + (ehApache ? 0.68f : 0.02f)),
                ehApache ? new Vector3(0f, -s * 42f, 0f) : Vector3.zero,
                ehApache ? new Vector3(s * 0.10f, 0f, 0f) : new Vector3(s * 0.12f, 0f, -dLen * 0.88f),
                ctrl);
            Peca(PrimitiveType.Cube, "Folha_Porta_Heli", portaHeli, new Vector3(0f, -dH * 0.22f, 0f), new Vector3(0.055f, dH * 0.52f, dLen), cPrim, 0.72f);
            Peca(PrimitiveType.Cube, "Janela_Porta_Heli", portaHeli, new Vector3(0f, dH * 0.24f, 0f), new Vector3(0.035f, dH * 0.42f, dLen * 0.82f), cVidro, 0.92f);
        }

        // 5. Conjunto turboeixo duplo superior
        float turbDeckY = roofY + 0.08f;
        float turbLen = fuseLen * (ehSkycrane ? 0.68f : 0.52f);
        float turbZ = cabCenterZ - fuseLen * 0.14f;
        Peca(PrimitiveType.Cube, "Bloco_Turbinas_Superior", raiz, new Vector3(0f, turbDeckY + 0.08f, turbZ), new Vector3(fuseW * 0.64f, 0.34f, turbLen), cSec, 0.68f);
        for (int s = -1; s <= 1; s += 2)
        {
            float podX = s * (ehApache || ehSkycrane ? fuseW * 0.54f : fuseW * 0.24f);
            float podY = ehApache ? turbDeckY - 0.02f : turbDeckY + 0.10f;
            Peca(PrimitiveType.Cylinder, s < 0 ? "Turbina_E" : "Turbina_D", raiz, new Vector3(podX, podY, turbZ), new Vector3(ehApache ? 0.44f : 0.32f, turbLen * 0.44f, ehApache ? 0.44f : 0.32f), cSec, 0.65f).localRotation = Quaternion.Euler(90f, 0f, 0f);
            Peca(PrimitiveType.Cylinder, s < 0 ? "Exaustor_E" : "Exaustor_D", raiz, new Vector3(podX + s * 0.05f, podY, turbZ - turbLen * 0.48f), new Vector3(0.24f, 0.14f, 0.24f), cCromo, 0.85f).localRotation = Quaternion.Euler(90f, s * 12f, 0f);
        }

        // 6. Cone de cauda, estabilizador horizontal com endplates, deriva/V-tail e rotor antipar / Fenestron
        float boomStartZ = cabRearZ + 0.35f;
        float boomEndZ = -hl + 0.42f;
        float boomLen = Mathf.Max(2.2f, boomStartZ - boomEndZ);
        float boomY = cabBaseY + cabH * (ehSkycrane ? 0.78f : 0.72f);
        Peca(PrimitiveType.Cylinder, "Cone_Cauda", raiz, new Vector3(0f, boomY, (boomStartZ + boomEndZ) * 0.5f), new Vector3(0.42f, boomLen * 0.5f, 0.42f), cPrim, 0.75f).localRotation = Quaternion.Euler(90f, 0f, 0f);

        float hStabZ = boomEndZ + boomLen * 0.28f;
        Peca(PrimitiveType.Cube, "Estabilizador_Horizontal_Cauda", raiz, new Vector3(0f, boomY, hStabZ), new Vector3(fuseW * 0.92f, 0.06f, 0.42f), cPrim, 0.72f);
        for (int s = -1; s <= 1; s += 2)
            Peca(PrimitiveType.Cube, s < 0 ? "Endplate_E" : "Endplate_D", raiz, new Vector3(s * fuseW * 0.46f, boomY + 0.04f, hStabZ), new Vector3(0.04f, 0.32f, 0.36f), cDest, 0.72f);

        if (ehStealth)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                Transform sFin = Peca(PrimitiveType.Cube, s < 0 ? "Deriva_VTail_E" : "Deriva_VTail_D", raiz, new Vector3(s * 0.24f, boomY + 0.46f, boomEndZ + 0.14f), new Vector3(0.06f, 0.92f, 0.52f), cPrim, 0.65f);
                sFin.localRotation = Quaternion.Euler(22f, 0f, -s * 20f);
            }
        }
        else
        {
            Transform vFin = Peca(PrimitiveType.Cube, "Deriva_Vertical_Cauda", raiz, new Vector3(0f, boomY + d.alt * 0.18f, boomEndZ + 0.16f), new Vector3(0.08f, d.alt * 0.36f, 0.56f), cDest, 0.72f);
            vFin.localRotation = Quaternion.Euler(22f, 0f, 0f);
        }

        GameObject rotorCauda = new GameObject((ehVIP || ehStealth) ? "Rotor_Fenestron" : "Rotor_Cauda");
        rotorCauda.transform.SetParent(raiz, false);
        rotorCauda.transform.localPosition = new Vector3((ehVIP || ehStealth) ? 0f : 0.12f, boomY + ((ehVIP || ehStealth) ? 0.42f : d.alt * 0.30f), boomEndZ + 0.06f);
        Peca(PrimitiveType.Cube, "Pa_Cauda_1", rotorCauda.transform, Vector3.zero, new Vector3(0.03f, 1.05f, 0.12f), cDest, 0.55f);
        Peca(PrimitiveType.Cube, "Pa_Cauda_2", rotorCauda.transform, Vector3.zero, new Vector3(0.03f, 0.12f, 1.05f), cDest, 0.55f);

        // 7. Trem de pouso (Apache rodas de cauda, Skycrane 4 rodas altas ou Esquis tubulares + degraus)
        if (ehApache)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                ctrl.rodasDianteiras.Add(CriarRoda(raiz, s < 0 ? "Roda_Apache_E" : "Roda_Apache_D", new Vector3(s * fuseW * 0.72f, 0.28f, cabFrontZ - 0.55f), 0.28f, 0.16f, cPneu, cAro, cDest));
                Peca(PrimitiveType.Cylinder, s < 0 ? "Haste_Pouso_E" : "Haste_Pouso_D", raiz, new Vector3(s * fuseW * 0.54f, cabBaseY * 0.65f, cabFrontZ - 0.58f), new Vector3(0.07f, 0.35f, 0.07f), cEscuro, 0.5f).localRotation = Quaternion.Euler(0f, 0f, s * 28f);
            }
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Roda_Cauda_Apache", new Vector3(0f, 0.16f, boomEndZ + 0.20f), 0.16f, 0.10f, cPneu, cAro, cDest));
        }
        else if (ehSkycrane)
        {
            float zF = cabCenterZ + 0.45f;
            float zR = cabRearZ - 0.45f;
            Peca(PrimitiveType.Cube, "Outrigger_Traseiro_Crane", raiz, new Vector3(0f, boomY - 0.06f, zR), new Vector3(fuseW * 1.12f, 0.14f, 0.18f), cSec, 0.55f);
            for (int s = -1; s <= 1; s += 2)
            {
                ctrl.rodasDianteiras.Add(CriarRoda(raiz, s < 0 ? "Roda_Crane_FE" : "Roda_Crane_FD", new Vector3(s * fuseW * 0.68f, 0.30f, zF), 0.30f, 0.18f, cPneu, cAro, cDest));
                ctrl.rodasTraseiras.Add(CriarRoda(raiz, s < 0 ? "Roda_Crane_TE" : "Roda_Crane_TD", new Vector3(s * fuseW * 0.68f, 0.30f, zR), 0.30f, 0.18f, cPneu, cAro, cDest));
                Peca(PrimitiveType.Cylinder, "Pilar_Crane_F", raiz, new Vector3(s * fuseW * 0.54f, cabBaseY * 0.65f, zF), new Vector3(0.09f, cabBaseY * 0.58f, 0.09f), cSec, 0.55f).localRotation = Quaternion.Euler(0f, 0f, s * 16f);
                Peca(PrimitiveType.Cylinder, "Pilar_Crane_T", raiz, new Vector3(s * fuseW * 0.60f, (boomY + 0.24f) * 0.5f, zR), new Vector3(0.09f, (boomY - 0.28f) * 0.52f, 0.09f), cSec, 0.55f).localRotation = Quaternion.Euler(0f, 0f, s * 8f);
            }
        }
        else
        {
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cylinder, s < 0 ? "Esqui_Pouso_E" : "Esqui_Pouso_D", raiz, new Vector3(s * fuseW * 0.50f, 0.06f, cabCenterZ), new Vector3(0.085f, fuseLen * 0.42f, 0.085f), cEscuro, 0.4f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                Peca(PrimitiveType.Cylinder, "Suporte_Esqui_F", raiz, new Vector3(s * fuseW * 0.39f, (cabBaseY + 0.10f) * 0.5f, cabCenterZ + fuseLen * 0.22f), new Vector3(0.06f, cabBaseY * 0.55f, 0.06f), cEscuro, 0.4f).localRotation = Quaternion.Euler(0f, 0f, s * 24f);
                Peca(PrimitiveType.Cylinder, "Suporte_Esqui_T", raiz, new Vector3(s * fuseW * 0.39f, (cabBaseY + 0.10f) * 0.5f, cabCenterZ - fuseLen * 0.22f), new Vector3(0.06f, cabBaseY * 0.55f, 0.06f), cEscuro, 0.4f).localRotation = Quaternion.Euler(0f, 0f, s * 24f);
                if (ehVIP || ehPolicia || ehResgate)
                    Peca(PrimitiveType.Cube, s < 0 ? "Degrau_Esqui_E" : "Degrau_Esqui_D", raiz, new Vector3(s * (fuseW * 0.52f), 0.18f, cabCenterZ), new Vector3(0.11f, 0.03f, fuseLen * 0.34f), ehVIP ? cCromo : cAro, 0.85f);
            }
        }

        // 8. Rotor Principal com Mastro + Swashplate + 4/5 pás (+ Radar Longbow no Apache)
        GameObject rotorPivo = new GameObject("Rotor_Principal");
        rotorPivo.transform.SetParent(raiz, false);
        rotorPivo.transform.localPosition = new Vector3(0f, turbDeckY + 0.26f, cabCenterZ - fuseLen * 0.06f);
        Peca(PrimitiveType.Cylinder, "Mastro_Rotor", rotorPivo.transform, new Vector3(0f, -0.05f, 0f), new Vector3(0.20f, 0.24f, 0.20f), cEscuro, 0.5f);
        Peca(PrimitiveType.Cylinder, "Swashplate", rotorPivo.transform, new Vector3(0f, 0.04f, 0f), new Vector3(0.40f, 0.04f, 0.40f), cCromo, 0.85f);
        Peca(PrimitiveType.Cube, "Pa_1", rotorPivo.transform, new Vector3(0f, 0.17f, 0f), new Vector3(d.comp * 0.86f, 0.03f, 0.19f), cEscuro, 0.45f);
        Peca(PrimitiveType.Cube, "Pa_2", rotorPivo.transform, new Vector3(0f, 0.17f, 0f), new Vector3(0.19f, 0.03f, d.comp * 0.86f), cEscuro, 0.45f);
        if (ehApache)
            Peca(PrimitiveType.Sphere, "Radar_Longbow", rotorPivo.transform, new Vector3(0f, 0.45f, 0f), new Vector3(0.75f, 0.28f, 0.75f), cSec, 0.55f);
        ctrl.rotores.Add(rotorPivo.transform);
        ctrl.rotores.Add(rotorCauda.transform);

        // 9. Kits específicos (Apache asas/foguetes/canhão, Polícia FLIR/holofote, Resgate/Skycrane guincho)
        if (ehApache)
        {
            float wBaseZ = cabCenterZ - 0.85f;
            Peca(PrimitiveType.Cube, "Canhao_30mm_Apache", raiz, new Vector3(0f, cabBaseY - 0.08f, cabFrontZ + 0.10f), new Vector3(0.06f, 0.06f, 0.95f), cEscuro, 0.5f);
            Peca(PrimitiveType.Cube, "Asas_Stub_Apache", raiz, new Vector3(0f, cabBaseY + cabH * 0.44f, wBaseZ), new Vector3(d.larg * 0.94f, 0.09f, 0.72f), cPrim, 0.6f);
            for (int s = -1; s <= 1; s += 2)
            {
                Peca(PrimitiveType.Cube, s < 0 ? "Pilone_Hydra_E" : "Pilone_Hydra_D", raiz, new Vector3(s * d.larg * 0.26f, cabBaseY + cabH * 0.35f, wBaseZ), new Vector3(0.08f, cabH * 0.20f, 0.48f), cEscuro, 0.5f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Foguetes_Hydra_E" : "Foguetes_Hydra_D", raiz, new Vector3(s * d.larg * 0.26f, cabBaseY + cabH * 0.26f, wBaseZ), new Vector3(0.30f, 0.52f, 0.30f), cSec, 0.5f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                Peca(PrimitiveType.Cube, s < 0 ? "Pilone_Hellfire_E" : "Pilone_Hellfire_D", raiz, new Vector3(s * d.larg * 0.39f, cabBaseY + cabH * 0.35f, wBaseZ), new Vector3(0.08f, cabH * 0.20f, 0.42f), cEscuro, 0.5f);
                Peca(PrimitiveType.Cylinder, s < 0 ? "Missil_Hellfire_E" : "Missil_Hellfire_D", raiz, new Vector3(s * d.larg * 0.39f, cabBaseY + cabH * 0.26f, wBaseZ + 0.04f), new Vector3(0.10f, 0.58f, 0.10f), cEscuro, 0.5f).localRotation = Quaternion.Euler(90f, 0f, 0f);
            }
        }
        else if (ehPolicia)
        {
            Peca(PrimitiveType.Sphere, "Camera_FLIR_Policia", raiz, new Vector3(0f, cabBaseY + 0.04f, cabFrontZ - 0.05f), new Vector3(0.34f, 0.28f, 0.34f), cEscuro, 0.6f);
            Peca(PrimitiveType.Cylinder, "Holofote_Nightsun", raiz, new Vector3(-fuseW * 0.44f, cabBaseY + 0.14f, cabFrontZ - 0.16f), new Vector3(0.22f, 0.14f, 0.22f), cCromo, 0.85f).localRotation = Quaternion.Euler(90f, 0f, 0f);
            Transform gPol = PecaEmissiva(PrimitiveType.Cube, "Giroflex_Heli_Policia", raiz, new Vector3(0f, turbDeckY + 0.26f, turbZ + turbLen * 0.38f), new Vector3(fuseW * 0.54f, 0.08f, 0.16f));
            ctrl.giroflexVermelho.Add(gPol.GetComponent<Renderer>());
        }
        if (ehResgate || d.extras.Contains("heli_winch"))
        {
            Peca(PrimitiveType.Cube, "Guincho_Resgate", raiz, new Vector3(fuseW * 0.56f, roofY - 0.04f, cabCenterZ + 0.15f), new Vector3(0.24f, 0.22f, 0.36f), cDest, 0.7f);
            if (ehSkycrane)
                Peca(PrimitiveType.Cylinder, "Cabo_Carga_Skycrane", raiz, new Vector3(0f, cabBaseY + cabH * 0.20f, cabCenterZ - fuseLen * 0.28f), new Vector3(0.04f, 0.48f, 0.04f), cCromo, 0.85f);
        }
    }

    private static void MontarAviaoOuJato(
        Transform raiz, DefVeiculo d, ControleVeiculo50 ctrl,
        Color cPrim, Color cSec, Color cDest, Color cVidro, Color cPneu, Color cAro)
    {
        bool ehJato = d.arquetipo == "jet";
        bool ehCessna = d.codigo == "VHC-87";
        bool ehHidro = d.extras.Contains("seaplane_floats");
        bool ehBiplano = d.extras.Contains("biplane_wings");
        bool ehKingAir = d.codigo == "VHC-90";
        bool ehCargueiro = d.codigo == "VHC-91";
        bool ehLear = d.codigo == "VHC-92";
        bool ehF22 = d.codigo == "VHC-93";
        bool ehF16 = d.codigo == "VHC-94";
        bool ehAcro = d.codigo == "VHC-95";
        bool ehConcorde = d.codigo == "VHC-96";
        bool ehCaca = ehF22 || ehF16 || ehAcro;
        bool ehBimotor = ehKingAir || ehCargueiro || d.extras.Contains("twin_prop_nacelles");

        float hl = d.comp * 0.5f;
        float fuseW = ehCaca ? Mathf.Min(1.42f, d.larg * 0.16f) : (ehConcorde ? 1.32f : (ehCargueiro ? 1.92f : Mathf.Min(1.48f, d.larg * 0.14f)));
        float fuseH = ehCargueiro ? d.alt * 0.42f : d.alt * 0.36f;
        float fy = ehHidro ? d.vao + 0.88f : d.vao + fuseH * 0.58f;
        Color cEscuro = new Color(0.14f, 0.15f, 0.18f);
        Color cCromo = new Color(0.88f, 0.90f, 0.92f);

        // 1. Fuselagem escalonada por tipo (sem esfera gigante flutuando!)
        Peca(PrimitiveType.Cube, "Fuselagem_Central", raiz, new Vector3(0f, fy, -d.comp * 0.04f), new Vector3(fuseW * 0.92f, fuseH * 0.78f, d.comp * 0.62f), cPrim, 0.78f);
        Transform coneNariz = Peca(PrimitiveType.Cylinder, "Cone_Nariz", raiz, new Vector3(0f, fy - (ehConcorde ? fuseH * 0.12f : 0f), hl * 0.72f), new Vector3(fuseW * (ehConcorde ? 0.56f : 0.78f), d.comp * 0.18f, fuseH * (ehConcorde ? 0.54f : 0.74f)), cPrim, 0.78f);
        coneNariz.localRotation = Quaternion.Euler(ehConcorde ? 98f : 90f, 0f, 0f);
        Transform coneCauda = Peca(PrimitiveType.Cylinder, "Cone_Cauda_Aviao", raiz, new Vector3(0f, fy + fuseH * 0.06f, -hl * 0.72f), new Vector3(fuseW * 0.66f, d.comp * 0.20f, fuseH * 0.64f), cPrim, 0.78f);
        coneCauda.localRotation = Quaternion.Euler(90f, 0f, 0f);

        if (ehF16)
        {
            Peca(PrimitiveType.Cube, "Tomada_Ar_Ventral_F16", raiz, new Vector3(0f, fy - fuseH * 0.48f, d.comp * 0.14f), new Vector3(fuseW * 0.62f, 0.32f, d.comp * 0.24f), cEscuro, 0.55f);
        }
        else if (ehBiplano)
        {
            Peca(PrimitiveType.Cylinder, "Capo_Radial_Biplano", raiz, new Vector3(0f, fy, hl * 0.78f), new Vector3(fuseW * 0.96f, 0.28f, fuseW * 0.96f), cSec, 0.75f).localRotation = Quaternion.Euler(90f, 0f, 0f);
        }

        // 2. Cabine interna + Para-brisa emoldurado OU Canopi com trilho em titânio
        if (ehCaca)
        {
            Transform pivoCanopi = CriarPivoArticulado(raiz, "Canopi_Caca_Articulado", new Vector3(0f, fy + fuseH * 0.28f, -hl * 0.06f), new Vector3(-38f, 0f, 0f), Vector3.zero, ctrl);
            float cLen = d.comp * (ehAcro ? 0.28f : 0.22f);
            Peca(PrimitiveType.Cube, "Moldura_Canopi", pivoCanopi, new Vector3(0f, 0.02f, cLen * 0.5f), new Vector3(fuseW * 0.56f, 0.07f, cLen), cEscuro, 0.5f);
            Peca(PrimitiveType.Sphere, "Vidro_Canopi_Caca", pivoCanopi, new Vector3(0f, 0.14f, cLen * 0.5f), new Vector3(fuseW * 0.54f, fuseH * 0.68f, cLen * 0.94f), cVidro, 0.95f);
        }
        else
        {
            float wsBotZ = ehConcorde ? hl * 0.68f : ((ehCargueiro || ehLear) ? hl * 0.56f : hl * 0.44f);
            float wsTopZ = ehConcorde ? hl * 0.50f : ((ehCargueiro || ehLear) ? hl * 0.40f : hl * 0.22f);
            float wsBotY = fy + fuseH * 0.20f;
            float wsTopY = fy + fuseH * (ehConcorde ? 0.46f : 0.56f);
            float wsLen = Mathf.Sqrt((wsBotZ - wsTopZ) * (wsBotZ - wsTopZ) + (wsTopY - wsBotY) * (wsTopY - wsBotY));
            float wsDeg = Mathf.Atan2(wsBotZ - wsTopZ, wsTopY - wsBotY) * Mathf.Rad2Deg;
            Transform wsAv = Peca(PrimitiveType.Cube, "Parabrisa_Aviao", raiz, new Vector3(0f, (wsBotY + wsTopY) * 0.5f, (wsBotZ + wsTopZ) * 0.5f), new Vector3(fuseW * 0.78f, wsLen * 0.92f, 0.04f), cVidro, 0.95f);
            wsAv.localRotation = Quaternion.Euler(-wsDeg, 0f, 0f);
            Peca(PrimitiveType.Cube, "Teto_Cabine_Aviao", raiz, new Vector3(0f, wsTopY - 0.03f, (wsTopZ - hl * 0.46f) * 0.5f), new Vector3(fuseW * 0.80f, 0.12f, wsTopZ + hl * 0.46f), cPrim, 0.76f);
        }

        if (ehCargueiro)
        {
            Transform rampa = CriarPivoArticulado(raiz, "Rampa_Carga_Aviao", new Vector3(0f, fy - fuseH * 0.22f, -hl * 0.56f), new Vector3(-25f, 0f, 0f), Vector3.zero, ctrl);
            Peca(PrimitiveType.Cube, "Folha_Rampa", rampa, new Vector3(0f, 0f, -d.comp * 0.08f), new Vector3(fuseW * 0.68f, 0.09f, d.comp * 0.16f), cSec, 0.65f);
        }

        // 3. Asas principais (+ asa superior biplano ou mísseis/tanques subalares)
        float asaY = ehConcorde ? fy - fuseH * 0.18f : ((ehCaca || ehLear || ehKingAir) ? fy - fuseH * 0.10f : (ehBiplano ? fy - fuseH * 0.26f : fy + fuseH * 0.44f));
        float asaZ = ehConcorde ? -d.comp * 0.08f : (ehCaca ? -0.35f : 0.25f);
        Peca(PrimitiveType.Cube, "Asa_Principal", raiz, new Vector3(0f, asaY, asaZ), new Vector3(d.larg * 0.94f, ehCargueiro ? 0.14f : 0.10f, d.comp * (ehConcorde ? 0.46f : (ehCaca ? 0.28f : 0.16f))), cPrim, 0.76f);
        if (ehBiplano)
        {
            Peca(PrimitiveType.Cube, "Asa_Superior_Biplano", raiz, new Vector3(0f, fy + fuseH * 0.92f, asaZ + 0.22f), new Vector3(d.larg * 0.92f, 0.09f, d.comp * 0.16f), cPrim, 0.76f);
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cylinder, s < 0 ? "Montante_Asa_E" : "Montante_Asa_D", raiz, new Vector3(s * d.larg * 0.32f, (asaY + fy + fuseH * 0.92f) * 0.5f, asaZ + 0.12f), new Vector3(0.05f, fuseH * 0.62f, 0.05f), cEscuro, 0.5f);
        }
        else if (!ehJato && !ehBimotor)
        {
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cylinder, s < 0 ? "Tirante_Asa_E" : "Tirante_Asa_D", raiz, new Vector3(s * d.larg * 0.18f, (fy + asaY) * 0.5f, asaZ), new Vector3(0.05f, fuseH * 0.45f, 0.05f), cEscuro, 0.5f).localRotation = Quaternion.Euler(0f, 0f, -s * 42f);
        }
        if (d.extras.Contains("wingtip_missiles") || d.extras.Contains("drop_tanks"))
        {
            for (int s = -1; s <= 1; s += 2)
            {
                if (d.extras.Contains("wingtip_missiles"))
                {
                    Peca(PrimitiveType.Cube, s < 0 ? "Trilho_Ponta_Asa_E" : "Trilho_Ponta_Asa_D", raiz, new Vector3(s * (d.larg * 0.47f + 0.03f), asaY, asaZ), new Vector3(0.14f, 0.07f, 1.35f), cEscuro, 0.5f);
                    Peca(PrimitiveType.Cylinder, s < 0 ? "Missil_Asa_E" : "Missil_Asa_D", raiz, new Vector3(s * (d.larg * 0.47f + 0.10f), asaY, asaZ + 0.10f), new Vector3(0.11f, 0.96f, 0.11f), cDest, 0.6f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                }
                if (d.extras.Contains("drop_tanks"))
                {
                    Peca(PrimitiveType.Cube, s < 0 ? "Pilone_Tanque_E" : "Pilone_Tanque_D", raiz, new Vector3(s * d.larg * 0.26f, asaY - 0.12f, asaZ - 0.12f), new Vector3(0.06f, 0.22f, 0.72f), cEscuro, 0.5f);
                    Peca(PrimitiveType.Cylinder, s < 0 ? "Tanque_Subalar_E" : "Tanque_Subalar_D", raiz, new Vector3(s * d.larg * 0.26f, asaY - 0.28f, asaZ - 0.08f), new Vector3(0.32f, 0.95f, 0.32f), cSec, 0.65f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                }
            }
        }

        // 4. Empenagem (T-Tail King Air & LearJet, Dupla F-22, Delta Concorde)
        float tailZ = -hl + d.comp * 0.12f;
        bool ehTTail = ehKingAir || ehLear;
        float vFinH = d.alt * 0.44f;
        if (ehF22)
        {
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cube, s < 0 ? "Deriva_F22_E" : "Deriva_F22_D", raiz, new Vector3(s * fuseW * 0.52f, fy + vFinH * 0.5f, tailZ + 0.10f), new Vector3(0.08f, vFinH, d.comp * 0.15f), cPrim, 0.72f).localRotation = Quaternion.Euler(18f, 0f, -s * 18f);
        }
        else
        {
            Peca(PrimitiveType.Cube, "Deriva_Vertical", raiz, new Vector3(0f, fy + vFinH * 0.55f, tailZ + 0.08f), new Vector3(0.09f, vFinH, d.comp * 0.14f), cDest, 0.72f).localRotation = Quaternion.Euler(18f, 0f, 0f);
        }
        if (!ehConcorde)
            Peca(PrimitiveType.Cube, ehTTail ? "Empenagem_TTail" : "Estabilizador_H", raiz, new Vector3(0f, ehTTail ? fy + vFinH : fy + fuseH * 0.16f, ehTTail ? tailZ - 0.16f : tailZ), new Vector3(d.larg * (ehCaca ? 0.48f : 0.34f), 0.06f, d.comp * 0.10f), cSec, 0.72f);

        // 5. Propulsão
        if (ehLear)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                float nx = s * fuseW * 0.78f;
                float ny = fy + fuseH * 0.26f;
                float nz = -hl * 0.44f;
                Peca(PrimitiveType.Cylinder, s < 0 ? "Turbofan_Traseiro_E" : "Turbofan_Traseiro_D", raiz, new Vector3(nx, ny, nz), new Vector3(0.48f, 0.75f, 0.48f), cSec, 0.72f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                Transform fanF = Peca(PrimitiveType.Cube, s < 0 ? "Turbina_Frontal_E" : "Turbina_Frontal_D", raiz, new Vector3(nx, ny, nz + 0.76f), new Vector3(0.36f, 0.06f, 0.04f), cAro, 0.85f);
                ctrl.helices.Add(fanF);
                Transform fanT = Peca(PrimitiveType.Cube, s < 0 ? "Turbina_Traseira_E" : "Turbina_Traseira_D", raiz, new Vector3(nx, ny, nz - 0.76f), new Vector3(0.32f, 0.06f, 0.04f), cAro, 0.85f);
                ctrl.helices.Add(fanT);
                Transform chama = PecaChama(s < 0 ? "Chama_Jato_E" : "Chama_Jato_D", raiz, new Vector3(nx, ny, nz - 1.18f), new Vector3(0.24f, 0.45f, 0.24f));
                chama.localRotation = Quaternion.Euler(90f, 0f, 0f);
                ctrl.chamasJato.Add(chama);
            }
        }
        else if (ehConcorde)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                float bx = s * d.larg * 0.20f;
                Peca(PrimitiveType.Cube, s < 0 ? "Turbinas_Olympus_E" : "Turbinas_Olympus_D", raiz, new Vector3(bx, asaY - 0.20f, asaZ - 0.45f), new Vector3(0.76f, 0.36f, 2.20f), cSec, 0.65f);
                for (int t = -1; t <= 1; t += 2)
                {
                    float tx = bx + t * 0.18f;
                    Transform fanF = Peca(PrimitiveType.Cube, "Turbina_Olympus_F", raiz, new Vector3(tx, asaY - 0.20f, asaZ + 0.66f), new Vector3(0.24f, 0.05f, 0.04f), cAro, 0.85f);
                    ctrl.helices.Add(fanF);
                    Transform fanT = Peca(PrimitiveType.Cube, "Turbina_Olympus_T", raiz, new Vector3(tx, asaY - 0.20f, asaZ - 1.62f), new Vector3(0.22f, 0.05f, 0.04f), cAro, 0.85f);
                    ctrl.helices.Add(fanT);
                    Transform chama = PecaChama("Chama_Olympus", raiz, new Vector3(tx, asaY - 0.20f, asaZ - 2.05f), new Vector3(0.22f, 0.50f, 0.22f));
                    chama.localRotation = Quaternion.Euler(90f, 0f, 0f);
                    ctrl.chamasJato.Add(chama);
                }
            }
        }
        else if (ehJato)
        {
            int nNoz = (ehF22 || ehAcro) ? 2 : 1;
            for (int i = 0; i < nNoz; i++)
            {
                float nx = nNoz == 2 ? (i == 0 ? -fuseW * 0.28f : fuseW * 0.28f) : 0f;
                Peca(PrimitiveType.Cylinder, "Pos_Combustor_" + i, raiz, new Vector3(nx, fy, -hl + 0.22f), new Vector3(0.56f, 0.32f, 0.56f), cDest, 0.85f).localRotation = Quaternion.Euler(90f, 0f, 0f);
                Transform fanT = Peca(PrimitiveType.Cube, "Turbina_Jato_" + i, raiz, new Vector3(nx, fy, -hl - 0.08f), new Vector3(0.36f, 0.06f, 0.04f), cAro, 0.85f);
                ctrl.helices.Add(fanT);
                Transform chama = PecaChama("Chama_PosCombustor_" + i, raiz, new Vector3(nx, fy, -hl - 0.65f), new Vector3(0.30f, 0.65f, 0.30f));
                chama.localRotation = Quaternion.Euler(90f, 0f, 0f);
                ctrl.chamasJato.Add(chama);
            }
        }
        else if (ehBimotor)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                float nx = s * d.larg * 0.22f;
                Peca(PrimitiveType.Cube, s < 0 ? "Nacele_Turbo_E" : "Nacele_Turbo_D", raiz, new Vector3(nx, asaY - 0.05f, asaZ + 0.35f), new Vector3(0.46f, 0.48f, 1.50f), cSec, 0.7f);
                Transform hel = Peca(PrimitiveType.Cube, s < 0 ? "Helice_Asa_E" : "Helice_Asa_D", raiz, new Vector3(nx, asaY, asaZ + 1.18f), new Vector3(1.65f, 0.12f, 0.05f), cEscuro, 0.75f);
                ctrl.helices.Add(hel);
            }
        }
        else
        {
            Transform hel = Peca(PrimitiveType.Cube, "Helice_Frontal", raiz, new Vector3(0f, fy, hl - 0.02f), new Vector3(1.85f, 0.14f, 0.05f), cEscuro, 0.75f);
            ctrl.helices.Add(hel);
        }

        // 6. Trem de pouso ou Flutuadores Anfíbios
        if (ehHidro)
        {
            for (int s = -1; s <= 1; s += 2)
                Peca(PrimitiveType.Cube, s < 0 ? "Flutuador_E" : "Flutuador_D", raiz, new Vector3(s * 1.15f, 0.22f, 0.30f), new Vector3(0.46f, 0.36f, d.comp * 0.54f), cSec, 0.7f);
        }
        else if (d.raioRoda > 0.05f)
        {
            ctrl.rodasDianteiras.Add(CriarRoda(raiz, "Trem_Dianteiro", new Vector3(0f, d.raioRoda * 0.82f, ehBiplano ? -hl + 0.45f : d.comp * 0.28f), d.raioRoda * 0.82f, d.largRoda * 0.8f, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Trem_E", new Vector3(-fuseW * 0.85f, d.raioRoda, ehBiplano ? d.comp * 0.18f : -0.35f), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
            ctrl.rodasTraseiras.Add(CriarRoda(raiz, "Trem_D", new Vector3(fuseW * 0.85f, d.raioRoda, ehBiplano ? d.comp * 0.18f : -0.35f), d.raioRoda, d.largRoda, cPneu, cAro, cDest));
        }
    }

    private static Transform CriarPivoArticulado(Transform pai, string nome, Vector3 pos, Vector3 rotAberta, Vector3 deslAberto, ControleVeiculo50 ctrl)
    {
        GameObject pivo = new GameObject(nome);
        pivo.transform.SetParent(pai, false);
        pivo.transform.localPosition = pos;
        if (ctrl != null)
        {
            ctrl.portasArticuladas.Add(new ControleVeiculo50.PortaArticulada50
            {
                pivo = pivo.transform,
                rotacaoAbertaEuler = rotAberta,
                deslocamentoAbertoLocal = deslAberto,
                rotFechada = Quaternion.identity,
                posFechada = pos,
                inicializada = true
            });
        }
        return pivo.transform;
    }

    private static Transform CriarRoda(Transform pai, string nome, Vector3 pos, float raio, float larg, Color pneu, Color aro, Color pinca)
    {
        GameObject pivo = new GameObject(nome);
        pivo.transform.SetParent(pai, false);
        pivo.transform.localPosition = pos;
        float lado = pos.x < 0f ? -1f : 1f;

        Transform t = Peca(PrimitiveType.Cylinder, "Pneu", pivo.transform, Vector3.zero, new Vector3(raio * 2f, larg * 0.42f, raio * 2f), pneu, 0.15f);
        t.localRotation = Quaternion.Euler(0f, 0f, 90f);

        // Disco de freio ventilado + pinça atrás dos 5 raios duplos
        Transform disco = Peca(PrimitiveType.Cylinder, "Disco_Freio", pivo.transform, new Vector3(lado * larg * 0.43f, 0f, 0f), new Vector3(raio * 1.16f, 0.012f, raio * 1.16f), new Color(0.76f, 0.79f, 0.83f), 0.88f);
        disco.localRotation = Quaternion.Euler(0f, 0f, 90f);
        Peca(PrimitiveType.Cube, "Pinca_Freio", pivo.transform, new Vector3(lado * larg * 0.44f, raio * 0.24f, -raio * 0.32f), new Vector3(0.036f, raio * 0.30f, raio * 0.22f), pinca, 0.65f);

        Transform cubo = Peca(PrimitiveType.Cylinder, "Cubo_Central", pivo.transform, new Vector3(lado * larg * 0.46f, 0f, 0f), new Vector3(raio * 0.34f, 0.020f, raio * 0.34f), aro, 0.85f);
        cubo.localRotation = Quaternion.Euler(0f, 0f, 90f);

        // 5 raios duplos (10 hastes em Y) + anel externo da roda deixando o disco visível
        float aroRaio = raio * 0.66f;
        for (int i = 0; i < 5; i++)
        {
            float baseAng = i * 72f;
            for (int pair = -1; pair <= 1; pair += 2)
            {
                float angRad = (baseAng + pair * 11f) * Mathf.Deg2Rad;
                float cy = Mathf.Cos(angRad) * (aroRaio * 0.56f);
                float cz = Mathf.Sin(angRad) * (aroRaio * 0.56f);
                Transform raioMesh = Peca(PrimitiveType.Cube, "Raio_Duplo_" + i + "_" + (pair < 0 ? "A" : "B"), pivo.transform,
                    new Vector3(lado * larg * 0.47f, cy, cz),
                    new Vector3(0.022f, aroRaio * 0.84f, 0.024f), aro, 0.86f);
                raioMesh.localRotation = Quaternion.Euler(-(baseAng + pair * 11f), 0f, 0f);
            }
        }
        for (int seg = 0; seg < 10; seg++)
        {
            float segAng = seg * 36f;
            float segRad = segAng * Mathf.Deg2Rad;
            Transform borda = Peca(PrimitiveType.Cube, "Aro_Borda_" + seg, pivo.transform,
                new Vector3(lado * larg * 0.46f, Mathf.Cos(segRad) * aroRaio, Mathf.Sin(segRad) * aroRaio),
                new Vector3(0.040f, 0.032f, aroRaio * 0.68f), aro, 0.86f);
            borda.localRotation = Quaternion.Euler(-segAng, 0f, 0f);
        }
        return pivo.transform;
    }

    private static Transform Peca(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 esc, Color cor, float smoothness)
    {
        GameObject go = GameObject.CreatePrimitive(tipo);
        go.name = nome;
        Collider c = go.GetComponent<Collider>();
        if (c != null)
        {
            if (Application.isPlaying) Destroy(c);
            else DestroyImmediate(c);
        }
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = esc;
        Renderer rend = go.GetComponent<Renderer>();
        rend.sharedMaterial = PegarMaterial(cor, smoothness);
        if (cor.a < 0.99f) rend.shadowCastingMode = ShadowCastingMode.Off;
        return go.transform;
    }

    private static Transform PecaEmissiva(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 esc)
    {
        GameObject go = GameObject.CreatePrimitive(tipo);
        go.name = nome;
        Collider c = go.GetComponent<Collider>();
        if (c != null)
        {
            if (Application.isPlaying) Destroy(c);
            else DestroyImmediate(c);
        }
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = esc;
        Renderer rend = go.GetComponent<Renderer>();
        rend.sharedMaterial = PegarMaterialEmissivo();
        rend.shadowCastingMode = ShadowCastingMode.Off;
        return go.transform;
    }

    private static Transform PecaChama(string nome, Transform pai, Vector3 pos, Vector3 esc)
    {
        Transform t = PecaEmissiva(PrimitiveType.Capsule, nome, pai, pos, esc);
        if (matChamaCompartilhado == null)
        {
            matChamaCompartilhado = new Material(PegarMaterialEmissivo()) { enableInstancing = true };
            if (matChamaCompartilhado.HasProperty("_BaseColor")) matChamaCompartilhado.SetColor("_BaseColor", new Color(1f, 0.55f, 0.08f, 0.85f));
            if (matChamaCompartilhado.HasProperty("_Color")) matChamaCompartilhado.SetColor("_Color", new Color(1f, 0.55f, 0.08f, 0.85f));
            if (matChamaCompartilhado.HasProperty("_EmissionColor")) matChamaCompartilhado.SetColor("_EmissionColor", new Color(1f, 0.45f, 0.05f) * 2.8f);
        }
        t.GetComponent<Renderer>().sharedMaterial = matChamaCompartilhado;
        return t;
    }

    private static Transform CriarGrupo(Transform pai, string nome)
    {
        GameObject g = new GameObject(nome);
        g.transform.SetParent(pai, false);
        return g.transform;
    }

    private static Transform OrganizarGruposPadronizados(Transform raiz, ControleVeiculo50 ctrl)
    {
        Transform grupoChassi = CriarGrupo(raiz, "Grupo_Chassi");
        Transform grupoRodas = CriarGrupo(raiz, "Grupo_Rodas");
        Transform grupoPortas = CriarGrupo(raiz, "Grupo_Portas");
        Transform grupoCapo = CriarGrupo(raiz, "Grupo_Capo");
        Transform grupoLuzes = CriarGrupo(raiz, "Grupo_Farois_Lanternas");
        Transform grupoVidros = CriarGrupo(raiz, "Grupo_Vidros");
        Transform grupoInterior = CriarGrupo(raiz, "Grupo_Interior");

        HashSet<Transform> rodasSet = new HashSet<Transform>();
        for (int i = 0; i < ctrl.rodasDianteiras.Count; i++) if (ctrl.rodasDianteiras[i] != null) rodasSet.Add(ctrl.rodasDianteiras[i]);
        for (int i = 0; i < ctrl.rodasTraseiras.Count; i++) if (ctrl.rodasTraseiras[i] != null) rodasSet.Add(ctrl.rodasTraseiras[i]);

        HashSet<Transform> luzesSet = new HashSet<Transform>();
        for (int i = 0; i < ctrl.farois.Count; i++) if (ctrl.farois[i] != null) luzesSet.Add(ctrl.farois[i].transform);
        for (int i = 0; i < ctrl.lanternas.Count; i++) if (ctrl.lanternas[i] != null) luzesSet.Add(ctrl.lanternas[i].transform);
        for (int i = 0; i < ctrl.giroflexVermelho.Count; i++) if (ctrl.giroflexVermelho[i] != null) luzesSet.Add(ctrl.giroflexVermelho[i].transform);
        for (int i = 0; i < ctrl.giroflexAzul.Count; i++) if (ctrl.giroflexAzul[i] != null) luzesSet.Add(ctrl.giroflexAzul[i].transform);
        for (int i = 0; i < ctrl.giroflexAmbar.Count; i++) if (ctrl.giroflexAmbar[i] != null) luzesSet.Add(ctrl.giroflexAmbar[i].transform);

        List<Transform> filhos = new List<Transform>(raiz.childCount);
        for (int i = 0; i < raiz.childCount; i++)
        {
            Transform ch = raiz.GetChild(i);
            if (ch == grupoChassi || ch == grupoRodas || ch == grupoPortas || ch == grupoCapo ||
                ch == grupoLuzes || ch == grupoVidros || ch == grupoInterior)
                continue;
            filhos.Add(ch);
        }

        for (int i = 0; i < filhos.Count; i++)
        {
            Transform ch = filhos[i];
            string nm = ch.name;

            if (rodasSet.Contains(ch) || nm.StartsWith("Roda_") || nm.StartsWith("Trem_") || nm.StartsWith("Estepe_"))
                ch.SetParent(grupoRodas, false);
            else if (nm.StartsWith("Porta_") || nm.StartsWith("Persiana_") || nm.StartsWith("Cacamba_Basculante"))
                ch.SetParent(grupoPortas, false);
            else if (nm.StartsWith("Capo_") || nm.StartsWith("Escotilha_") || nm.StartsWith("Canopi_"))
                ch.SetParent(grupoCapo, false);
            else if (luzesSet.Contains(ch) || nm.StartsWith("Farol") || nm.StartsWith("Lanterna") || nm.StartsWith("Giroflex") || nm.StartsWith("Estrobo") || nm.StartsWith("Luminoso") || nm.StartsWith("Letreiro"))
                ch.SetParent(grupoLuzes, false);
            else if (nm.StartsWith("Vidro") || nm.StartsWith("Parabrisa") || nm.StartsWith("Janela"))
                ch.SetParent(grupoVidros, false);
            else if (ch == ctrl.volantePivo || ch == ctrl.guidaoPivo || nm.StartsWith("Volante") || nm.StartsWith("Guidao") || nm.StartsWith("Banco") || nm.StartsWith("Painel") || nm.StartsWith("Assento") || nm.StartsWith("Selim") || nm.StartsWith("Maca_") || nm == "Retrovisor_Interno")
                ch.SetParent(grupoInterior, false);
            else
                ch.SetParent(grupoChassi, false);
        }

        return grupoChassi;
    }

    private static void CombinarMalhasEstaticas(Transform grupoChassi, ControleVeiculo50 ctrl)
    {
        if (grupoChassi == null || ctrl == null) return;

        HashSet<Transform> pivosProtegidos = new HashSet<Transform>();
        if (ctrl.volantePivo != null) pivosProtegidos.Add(ctrl.volantePivo);
        if (ctrl.guidaoPivo != null) pivosProtegidos.Add(ctrl.guidaoPivo);
        if (ctrl.pedivelaPivo != null) pivosProtegidos.Add(ctrl.pedivelaPivo);
        if (ctrl.tamborBetoneira != null) pivosProtegidos.Add(ctrl.tamborBetoneira);
        for (int i = 0; i < ctrl.pedais.Count; i++) if (ctrl.pedais[i] != null) pivosProtegidos.Add(ctrl.pedais[i]);
        for (int i = 0; i < ctrl.rodasDianteiras.Count; i++) if (ctrl.rodasDianteiras[i] != null) pivosProtegidos.Add(ctrl.rodasDianteiras[i]);
        for (int i = 0; i < ctrl.rodasTraseiras.Count; i++) if (ctrl.rodasTraseiras[i] != null) pivosProtegidos.Add(ctrl.rodasTraseiras[i]);
        for (int i = 0; i < ctrl.rotores.Count; i++) if (ctrl.rotores[i] != null) pivosProtegidos.Add(ctrl.rotores[i]);
        for (int i = 0; i < ctrl.helices.Count; i++) if (ctrl.helices[i] != null) pivosProtegidos.Add(ctrl.helices[i]);
        for (int i = 0; i < ctrl.chamasJato.Count; i++) if (ctrl.chamasJato[i] != null) pivosProtegidos.Add(ctrl.chamasJato[i]);
        for (int i = 0; i < ctrl.escovasVarredoura.Count; i++) if (ctrl.escovasVarredoura[i] != null) pivosProtegidos.Add(ctrl.escovasVarredoura[i]);
        for (int i = 0; i < ctrl.portasArticuladas.Count; i++)
            if (ctrl.portasArticuladas[i] != null && ctrl.portasArticuladas[i].pivo != null)
                pivosProtegidos.Add(ctrl.portasArticuladas[i].pivo);

        HashSet<Renderer> emissivosProtegidos = new HashSet<Renderer>();
        for (int i = 0; i < ctrl.farois.Count; i++) if (ctrl.farois[i] != null) emissivosProtegidos.Add(ctrl.farois[i]);
        for (int i = 0; i < ctrl.lanternas.Count; i++) if (ctrl.lanternas[i] != null) emissivosProtegidos.Add(ctrl.lanternas[i]);
        for (int i = 0; i < ctrl.giroflexVermelho.Count; i++) if (ctrl.giroflexVermelho[i] != null) emissivosProtegidos.Add(ctrl.giroflexVermelho[i]);
        for (int i = 0; i < ctrl.giroflexAzul.Count; i++) if (ctrl.giroflexAzul[i] != null) emissivosProtegidos.Add(ctrl.giroflexAzul[i]);
        for (int i = 0; i < ctrl.giroflexAmbar.Count; i++) if (ctrl.giroflexAmbar[i] != null) emissivosProtegidos.Add(ctrl.giroflexAmbar[i]);

        MeshFilter[] filtros = grupoChassi.GetComponentsInChildren<MeshFilter>(true);
        Dictionary<Material, List<CombineInstance>> grupos = new Dictionary<Material, List<CombineInstance>>();
        List<MeshFilter> candidatos = new List<MeshFilter>();
        Matrix4x4 invChassi = grupoChassi.worldToLocalMatrix;

        for (int i = 0; i < filtros.Length; i++)
        {
            MeshFilter mf = filtros[i];
            if (mf == null || mf.sharedMesh == null) continue;
            Transform t = mf.transform;
            if (t == grupoChassi || t.childCount > 0 || t.GetComponents<Component>().Length > 3) continue;

            string nm = t.name;
            if (nm.Contains("Vidro") || nm.Contains("Parabrisa") || nm.Contains("Janela") || nm.Contains("Banco") ||
                nm.Contains("Painel") || nm.Contains("Volante") || nm.Contains("Guidao") || nm.Contains("Capo") ||
                nm.Contains("Porta") || nm.Contains("Farol") || nm.Contains("Lanterna") || nm.Contains("Roda"))
                continue;

            bool protegido = false;
            for (Transform cur = t; cur != null && cur != grupoChassi; cur = cur.parent)
            {
                if (pivosProtegidos.Contains(cur)) { protegido = true; break; }
            }
            if (protegido) continue;

            MeshRenderer mr = mf.GetComponent<MeshRenderer>();
            if (mr == null || mr.sharedMaterial == null || emissivosProtegidos.Contains(mr)) continue;

            if (!grupos.TryGetValue(mr.sharedMaterial, out List<CombineInstance> lista))
            {
                lista = new List<CombineInstance>();
                grupos[mr.sharedMaterial] = lista;
            }
            lista.Add(new CombineInstance
            {
                mesh = mf.sharedMesh,
                transform = invChassi * t.localToWorldMatrix
            });
            candidatos.Add(mf);
        }

        int lote = 0;
        foreach (var kv in grupos)
        {
            if (kv.Value.Count < 2) continue;
            Mesh combinada = new Mesh { name = grupoChassi.name + "_Lote_" + lote };
            combinada.CombineMeshes(kv.Value.ToArray(), true, true);
            combinada.Optimize();

            GameObject goLote = new GameObject("Chassi_Lote_" + lote++);
            goLote.transform.SetParent(grupoChassi, false);
            goLote.AddComponent<MeshFilter>().sharedMesh = combinada;
            MeshRenderer mrLote = goLote.AddComponent<MeshRenderer>();
            mrLote.sharedMaterial = kv.Key;
            if (kv.Key.renderQueue >= 3000) mrLote.shadowCastingMode = ShadowCastingMode.Off;
        }

        for (int i = 0; i < candidatos.Count; i++)
        {
            MeshFilter mf = candidatos[i];
            if (mf == null) continue;
            MeshRenderer mr = mf.GetComponent<MeshRenderer>();
            if (mr != null && mr.sharedMaterial != null && grupos.TryGetValue(mr.sharedMaterial, out var lst) && lst.Count < 2)
                continue;
            if (Application.isPlaying) Destroy(mf.gameObject);
            else DestroyImmediate(mf.gameObject);
        }
    }

    private static void GarantirShader()
    {
        if (shaderBase == null) shaderBase = Shader.Find("Universal Render Pipeline/Lit");
        if (shaderBase == null) shaderBase = Shader.Find("Standard");
    }

    private static Material PegarMaterial(Color cor, float smoothness)
    {
        Color32 c = cor;
        long qSmooth = Mathf.RoundToInt(Mathf.Clamp01(smoothness) * 20f);
        long chave = ((long)c.r << 32) | ((long)c.g << 24) | ((long)c.b << 16) | ((long)c.a << 8) | qSmooth;
        if (cacheMateriais.TryGetValue(chave, out Material existente) && existente != null)
            return existente;

        GarantirShader();
        Material m = new Material(shaderBase) { enableInstancing = true };
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", cor);
        if (m.HasProperty("_Color")) m.SetColor("_Color", cor);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
        if (cor.a < 0.99f)
        {
            m.SetFloat("_Surface", 1f);
            m.renderQueue = 3000;
        }
        cacheMateriais[chave] = m;
        return m;
    }

    private static Material PegarMaterialEmissivo()
    {
        if (matEmissivoCompartilhado != null) return matEmissivoCompartilhado;
        GarantirShader();
        matEmissivoCompartilhado = new Material(shaderBase) { enableInstancing = true };
        matEmissivoCompartilhado.EnableKeyword("_EMISSION");
        if (matEmissivoCompartilhado.HasProperty("_Smoothness")) matEmissivoCompartilhado.SetFloat("_Smoothness", 0.85f);
        return matEmissivoCompartilhado;
    }

#if UNITY_6000_0_OR_NEWER
    private static PhysicsMaterial PegarMaterialSemAtrito()
    {
        if (matFisicaSemAtrito != null) return matFisicaSemAtrito;
        matFisicaSemAtrito = new PhysicsMaterial("ChassiSemAtrito")
        {
            staticFriction = 0f,
            dynamicFriction = 0f,
            bounciness = 0.04f,
            frictionCombine = PhysicsMaterialCombine.Minimum,
            bounceCombine = PhysicsMaterialCombine.Minimum
        };
        return matFisicaSemAtrito;
    }
#else
    private static PhysicMaterial PegarMaterialSemAtrito()
    {
        if (matFisicaSemAtrito != null) return matFisicaSemAtrito;
        matFisicaSemAtrito = new PhysicMaterial("ChassiSemAtrito")
        {
            staticFriction = 0f,
            dynamicFriction = 0f,
            bounciness = 0.04f,
            frictionCombine = PhysicMaterialCombine.Minimum,
            bounceCombine = PhysicMaterialCombine.Minimum
        };
        return matFisicaSemAtrito;
    }
#endif

    private static Color Hex(string h) { Color c; ColorUtility.TryParseHtmlString(h, out c); return c; }
}
`;
}

export function generateTrafegoCidade50Cs(): string {
  return `using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// Sistema inteligente de circulação dos 50 novos veículos:
/// - Carros variados, motos, ambulâncias e ônibus perfeitamente alinhados na mão direita das ruas
/// - Respeitam semáforos e fazem curvas suaves nos cruzamentos
/// - Helicópteros voando em patrulha lá no alto em cima dos prédios
/// - Barcos navegando suavemente no rio
/// - Spawn distribuído entre frames e redução de custo de sombra para manter FPS alto
/// </summary>
[DisallowMultipleComponent]
public class TrafegoCidade50 : MonoBehaviour
{
    [Header("Limpeza Automática")]
    [Tooltip("Remove automaticamente carros antigos da cena (ex.: objeto 'carro' ou CarroControle antigo).")]
    public bool apagarCarrosAntigosNaCena = true;

    [Header("Frota Organizada nas Ruas")]
    [Range(8, 45)] public int quantidadeNaPista = 24;
    public float distanciaMinimaEntreVeiculos = 22f;
    public float velocidadeMediaTrafegoKmh = 36f;

    [Header("Otimização de Renderização")]
    public bool desabilitarSombrasEmMotos = true;

    [Header("Aéreos (em cima dos prédios) e Rio")]
    public bool spawnarHelicopterosNoCeu = true;
    public float altitudeHelicopteros = 48f;
    public bool spawnarBarcosNoRio = true;

    [Header("Referência da Cidade")]
    public string nomeObjetoAsfalto = "Malha_Ruas_Asfalto";
    public float esperaMaximaCidade = 15f;

    private GameObject container;
    private readonly List<VagaPista> vagasPista = new List<VagaPista>();

    private struct VagaPista
    {
        public Vector3 pos;
        public Vector3 dir;
        public int idxRua;
        public bool eixoX;
        public int sentido;
    }

    private IEnumerator Start()
    {
        if (apagarCarrosAntigosNaCena)
            RemoverVeiculosAntigos();

        GameObject asfalto = null;
        float t = 0f;
        while (t < esperaMaximaCidade)
        {
            asfalto = GameObject.Find(nomeObjetoAsfalto);
            if (asfalto != null) break;
            t += Time.deltaTime;
            yield return null;
        }

        yield return new WaitForFixedUpdate();
        yield return new WaitForFixedUpdate();
        Physics.SyncTransforms();

#if UNITY_2023_1_OR_NEWER
        GeradorCidadeInicial cidade = FindAnyObjectByType<GeradorCidadeInicial>();
#else
        GeradorCidadeInicial cidade = FindObjectOfType<GeradorCidadeInicial>();
#endif

        yield return StartCoroutine(GerarFrotaOrganizada(cidade, asfalto));
    }

    private static void RemoverVeiculosAntigos()
    {
#if UNITY_2023_1_OR_NEWER
        MonoBehaviour[] todos = FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None);
#else
        MonoBehaviour[] todos = FindObjectsOfType<MonoBehaviour>();
#endif
        for (int i = 0; i < todos.Length; i++)
        {
            if (todos[i] == null) continue;
            string tipo = todos[i].GetType().Name;
            if (tipo == "CarroControle" || tipo == "EntrarSairCarro" || tipo == "CidadeTransito" || tipo == "SistemaVeiculosEInteracao")
            {
                if (todos[i].gameObject.name.StartsWith("VHC-")) continue;
                Destroy(todos[i].gameObject);
            }
        }

        GameObject carroAntigo = GameObject.Find("carro");
        if (carroAntigo != null && carroAntigo.GetComponent<ControleVeiculo50>() == null)
            Destroy(carroAntigo);

        string[] gruposAntigos = { "Transito_Veiculos", "Carros_Estacionados" };
        for (int g = 0; g < gruposAntigos.Length; g++)
        {
            GameObject grp = GameObject.Find(gruposAntigos[g]);
            if (grp != null) Destroy(grp);
        }
    }

    private IEnumerator GerarFrotaOrganizada(GeradorCidadeInicial cidade, GameObject asfalto)
    {
        container = new GameObject("Frota_50_Circulacao");

        float[] ruasX = null;
        float[] ruasZ = null;
        float laneOff = 2.2f;
        float yAsfalto = 0.06f;

        if (cidade != null)
        {
            float pX = cidade.tamanhoQuadra + cidade.larguraRua;
            float pZ = cidade.tamanhoQuadra + cidade.larguraRua;
            float lx = cidade.quadrasX * cidade.tamanhoQuadra + (cidade.quadrasX + 1) * cidade.larguraRua;
            float lz = cidade.quadrasZ * cidade.tamanhoQuadra + (cidade.quadrasZ + 1) * cidade.larguraRua;
            float halfX = lx * 0.5f;
            float halfZ = lz * 0.5f;

            ruasX = new float[cidade.quadrasX + 1];
            for (int i = 0; i <= cidade.quadrasX; i++)
                ruasX[i] = -halfX + cidade.larguraRua * 0.5f + i * pX;

            ruasZ = new float[cidade.quadrasZ + 1];
            for (int k = 0; k <= cidade.quadrasZ; k++)
                ruasZ[k] = -halfZ + cidade.larguraRua * 0.5f + k * pZ;

            laneOff = Mathf.Clamp(cidade.larguraRua * 0.23f, 1.75f, 2.75f);
            yAsfalto = cidade.TopoAsfalto + 0.04f;

            ColetarVagasGrid(ruasX, ruasZ, laneOff, yAsfalto);
        }
        else
        {
            ColetarVagasFallback(asfalto);
        }

        Embaralhar(vagasPista);

        List<int> frotaCurada = MontarFrotaCurada(quantidadeNaPista);
        List<Vector3> usados = new List<Vector3>();
        float minDistSq = distanciaMinimaEntreVeiculos * distanciaMinimaEntreVeiculos;

        int colocados = 0;
        for (int i = 0; i < vagasPista.Count && colocados < frotaCurada.Count; i++)
        {
            VagaPista vaga = vagasPista[i];
            int idxModelo = frotaCurada[colocados];
            var def = Fabrica50Veiculos.CATALOGO[idxModelo];

            bool perto = false;
            float distReqSq = def.comp >= 7.5f ? minDistSq * 1.4f : minDistSq;
            for (int u = 0; u < usados.Count; u++)
            {
                if ((usados[u] - vaga.pos).sqrMagnitude < distReqSq)
                {
                    perto = true;
                    break;
                }
            }
            if (perto) continue;

            Vector3 posSpawn = AjustarAlturaSolo(vaga.pos);
            GameObject v = Fabrica50Veiculos.CriarVeiculo(idxModelo, posSpawn, Quaternion.LookRotation(vaga.dir));
            v.transform.SetParent(container.transform, true);

            if (desabilitarSombrasEmMotos && def.tipo == TipoFisicaVeiculo50.Moto)
            {
                Renderer[] rends = v.GetComponentsInChildren<Renderer>(true);
                for (int r = 0; r < rends.Length; r++)
                    rends[r].shadowCastingMode = ShadowCastingMode.Off;
            }

            ControleVeiculo50 ctrl = v.GetComponent<ControleVeiculo50>();
            if (ctrl != null)
            {
                float vel = velocidadeMediaTrafegoKmh;
                if (def.tipo == TipoFisicaVeiculo50.Moto) vel *= 1.15f;
                else if (def.arquetipo == "ambulance") vel *= 1.18f;
                else if (def.comp >= 7.5f) vel *= 0.80f;
                else vel *= Random.Range(0.90f, 1.15f);

                if (ruasX != null && ruasZ != null)
                    ctrl.ConfigurarViaGrid(ruasX, ruasZ, laneOff, vaga.idxRua, vaga.eixoX, vaga.sentido, vel);
                else
                    ctrl.ConfigurarIA(vaga.dir, vel);
            }

            usados.Add(vaga.pos);
            colocados++;
            if (colocados % 6 == 0) yield return null;
        }

        if (spawnarHelicopterosNoCeu)
            SpawnarHelicopterosAcimaDosPredios(cidade);

        if (spawnarBarcosNoRio)
            SpawnarAquaticos(cidade);
    }

    private void ColetarVagasGrid(float[] ruasX, float[] ruasZ, float laneOff, float yAsfalto)
    {
        vagasPista.Clear();

        // Segmentos no eixo X (entre ruasX[k] e ruasX[k+1]) ao longo de cada rua Z
        for (int iz = 0; iz < ruasZ.Length; iz++)
        {
            for (int ix = 0; ix < ruasX.Length - 1; ix++)
            {
                float xCentro = (ruasX[ix] + ruasX[ix + 1]) * 0.5f;
                for (int s = -1; s <= 1; s += 2)
                {
                    float zFaixa = ruasZ[iz] - s * laneOff;
                    Vector3 pos = new Vector3(xCentro, yAsfalto, zFaixa);
                    if (ControleVeiculo50.TemAsfalto(pos))
                    {
                        vagasPista.Add(new VagaPista
                        {
                            pos = pos,
                            dir = new Vector3(s, 0f, 0f),
                            idxRua = iz,
                            eixoX = true,
                            sentido = s
                        });
                    }
                }
            }
        }

        // Segmentos no eixo Z (entre ruasZ[k] e ruasZ[k+1]) ao longo de cada rua X
        for (int ix = 0; ix < ruasX.Length; ix++)
        {
            for (int iz = 0; iz < ruasZ.Length - 1; iz++)
            {
                float zCentro = (ruasZ[iz] + ruasZ[iz + 1]) * 0.5f;
                for (int s = -1; s <= 1; s += 2)
                {
                    float xFaixa = ruasX[ix] + s * laneOff;
                    Vector3 pos = new Vector3(xFaixa, yAsfalto, zCentro);
                    if (ControleVeiculo50.TemAsfalto(pos))
                    {
                        vagasPista.Add(new VagaPista
                        {
                            pos = pos,
                            dir = new Vector3(0f, 0f, s),
                            idxRua = ix,
                            eixoX = false,
                            sentido = s
                        });
                    }
                }
            }
        }
    }

    private void ColetarVagasFallback(GameObject asfalto)
    {
        vagasPista.Clear();
        Vector3 centro = Vector3.zero;
        float halfX = 90f, halfZ = 90f;
        if (asfalto != null && asfalto.GetComponent<Renderer>() != null)
        {
            Bounds b = asfalto.GetComponent<Renderer>().bounds;
            centro = b.center;
            halfX = Mathf.Max(20f, b.extents.x - 6f);
            halfZ = Mathf.Max(20f, b.extents.z - 6f);
        }

        Vector3[] eixos = { Vector3.forward, Vector3.back, Vector3.right, Vector3.left };
        for (float x = centro.x - halfX; x <= centro.x + halfX; x += 12f)
        {
            for (float z = centro.z - halfZ; z <= centro.z + halfZ; z += 12f)
            {
                Vector3 p = new Vector3(x, 0.08f, z);
                if (!ControleVeiculo50.TemAsfalto(p)) continue;
                for (int k = 0; k < 4; k++)
                {
                    if (ControleVeiculo50.TemAsfalto(p + eixos[k] * 10f))
                    {
                        vagasPista.Add(new VagaPista { pos = p, dir = eixos[k] });
                        break;
                    }
                }
            }
        }
    }

    private List<int> MontarFrotaCurada(int total)
    {
        List<int> resultado = new List<int>();
        List<int> ambulancias = new List<int>();
        List<int> onibus = new List<int>();
        List<int> motos = new List<int>();
        List<int> carros = new List<int>();

        for (int i = 0; i < Fabrica50Veiculos.CATALOGO.Length; i++)
        {
            var d = Fabrica50Veiculos.CATALOGO[i];
            if (d.arquetipo == "ambulance") ambulancias.Add(i);
            else if (d.arquetipo == "bus") onibus.Add(i);
            else if (d.tipo == TipoFisicaVeiculo50.Moto && d.arquetipo != "atv") motos.Add(i);
            else if (d.tipo == TipoFisicaVeiculo50.Carro && d.comp <= 6.2f && d.arquetipo != "monster" && d.codigo != "VHC-29")
                carros.Add(i);
        }

        Embaralhar(carros);
        Embaralhar(motos);

        // 1) Ambulâncias passando (2 unidades)
        for (int i = 0; i < 2 && ambulancias.Count > 0 && resultado.Count < total; i++)
            resultado.Add(ambulancias[i % ambulancias.Count]);

        // 2) Ônibus circulando (2 unidades espaçadas)
        for (int i = 0; i < Mathf.Min(2, onibus.Count) && resultado.Count < total; i++)
            resultado.Add(onibus[i]);

        // 3) Motos passando (~5 motos variadas)
        for (int i = 0; i < Mathf.Min(5, motos.Count) && resultado.Count < total; i++)
            resultado.Add(motos[i]);

        // 4) Vários carros diferentes passando (o restante até atingir 'total')
        int idxC = 0;
        while (resultado.Count < total && carros.Count > 0)
        {
            resultado.Add(carros[idxC % carros.Count]);
            idxC++;
        }

        return resultado;
    }

    private void SpawnarHelicopterosAcimaDosPredios(GeradorCidadeInicial cidade)
    {
        float raioBase = cidade != null
            ? Mathf.Max(38f, (cidade.quadrasX * cidade.tamanhoQuadra) * 0.36f)
            : 52f;

        int nHeli = 0;
        for (int i = 0; i < Fabrica50Veiculos.CATALOGO.Length; i++)
        {
            if (Fabrica50Veiculos.CATALOGO[i].tipo != TipoFisicaVeiculo50.Helicoptero) continue;

            float alt = altitudeHelicopteros + nHeli * 8f;
            float raio = raioBase + nHeli * 14f;
            float angIni = nHeli * Mathf.PI;
            Vector3 posIni = new Vector3(Mathf.Cos(angIni) * raio, alt, Mathf.Sin(angIni) * raio);

            GameObject h = Fabrica50Veiculos.CriarVeiculo(i, posIni, Quaternion.identity);
            h.transform.SetParent(container.transform, true);

            ControleVeiculo50 ctrl = h.GetComponent<ControleVeiculo50>();
            if (ctrl != null)
                ctrl.ConfigurarHelicopteroIA(Vector3.zero, raio, alt, angIni, nHeli % 2 == 0 ? 0.22f : -0.18f);

            nHeli++;
        }
    }

    private void SpawnarAquaticos(GeradorCidadeInicial cidade)
    {
        float yAgua = cidade != null ? cidade.NivelAgua + 0.14f : 0.14f;
        float meiaExt = cidade != null ? (cidade.quadrasX * cidade.tamanhoQuadra) * 0.45f : 70f;
        bool eixoX = cidade == null || cidade.eixoRio == GeradorCidadeInicial.EixoRio.LesteOeste_X;

        int nBarco = 0;
        for (int i = 0; i < Fabrica50Veiculos.CATALOGO.Length; i++)
        {
            var tipo = Fabrica50Veiculos.CATALOGO[i].tipo;
            if (tipo != TipoFisicaVeiculo50.Barco && tipo != TipoFisicaVeiculo50.Hovercraft) continue;

            float s = -meiaExt * 0.6f + nBarco * 18f;
            float cRio = cidade != null ? cidade.CentroRioEm(s) : 0f;
            Vector3 pos = eixoX ? new Vector3(s, yAgua, cRio) : new Vector3(cRio, yAgua, s);
            int sentido = nBarco % 2 == 0 ? 1 : -1;
            Vector3 dir = eixoX ? new Vector3(sentido, 0f, 0f) : new Vector3(0f, 0f, sentido);

            GameObject b = Fabrica50Veiculos.CriarVeiculo(i, pos, Quaternion.LookRotation(dir));
            b.transform.SetParent(container.transform, true);

            ControleVeiculo50 ctrl = b.GetComponent<ControleVeiculo50>();
            if (ctrl != null && tipo == TipoFisicaVeiculo50.Barco)
                ctrl.ConfigurarBarcoIA(cidade, s, sentido, meiaExt, 22f);

            nBarco++;
        }
    }

    private static Vector3 AjustarAlturaSolo(Vector3 p)
    {
        RaycastHit hit;
        if (Physics.Raycast(p + Vector3.up * 4f, Vector3.down, out hit, 10f, ~0, QueryTriggerInteraction.Ignore))
            return hit.point + Vector3.up * 0.05f;
        return p;
    }

    private static void Embaralhar<T>(List<T> lista)
    {
        for (int i = lista.Count - 1; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            T tmp = lista[i];
            lista[i] = lista[j];
            lista[j] = tmp;
        }
    }
}
`;
}
