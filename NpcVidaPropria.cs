using System.Collections.Generic;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

/// <summary>
/// NPC com "vida própria". Ele decide sozinho o que fazer:
/// andar, parar, olhar o celular, sentar na praça, conversar, correr,
/// atravessar a rua olhando os carros e se assustar com carros rápidos.
///
/// Não usa NavMesh. Ele descobre se está na calçada olhando o chão com Raycast
/// (procura objetos chamados "Calcada" e "Asfalto", criados pelo GeradorCidadeInicial).
///
/// USO: normalmente quem cria os NPCs é o script GeradorDeNpcs.
/// Mas você também pode colocar este script em um objeto vazio na cena.
/// </summary>
[DisallowMultipleComponent]
public partial class NpcVidaPropria : MonoBehaviour
{
    public enum Estado { Andando, Parado, Celular, Sentado, Conversando, Correndo, Atravessando, Assustado }
    private enum TipoChao { Nenhum, Calcada, Asfalto, Outro }

    // ---------------------------------------------------------------
    // CONFIGURAÇÕES (aparecem no Inspector)
    // ---------------------------------------------------------------
    [Header("Aparência")]
    [Tooltip("Opcional: arraste aqui um modelo seu (prefab). Se ficar vazio, o NPC vira uma cápsula colorida.")]
    public GameObject modeloPersonalizado;
    public Color[] coresDeRoupa = new Color[]
    {
        new Color(0.85f, 0.25f, 0.25f), new Color(0.25f, 0.45f, 0.85f), new Color(0.25f, 0.70f, 0.40f),
        new Color(0.90f, 0.75f, 0.20f), new Color(0.60f, 0.35f, 0.75f), new Color(0.90f, 0.50f, 0.20f),
        new Color(0.20f, 0.20f, 0.25f), new Color(0.90f, 0.90f, 0.90f)
    };

    [Header("Velocidades")]
    [Tooltip("Velocidade andando (metros por segundo).")] public float velocidadeAndar = 1.6f;
    [Tooltip("Velocidade correndo (metros por segundo).")] public float velocidadeCorrer = 4.2f;
    [Tooltip("Quão rápido ele vira o corpo (graus por segundo).")] public float velocidadeGiro = 420f;

    [Header("Tempos (segundos)")]
    public float tempoParadoMin = 2f;
    public float tempoParadoMax = 6f;
    public float tempoCelularMin = 5f;
    public float tempoCelularMax = 14f;
    public float tempoSentadoMin = 12f;
    public float tempoSentadoMax = 30f;
    public float tempoConversaMin = 8f;
    public float tempoConversaMax = 20f;

    [Header("Passeio")]
    [Tooltip("Até que distância ele escolhe um destino para passear.")] public float raioDestino = 30f;
    [Tooltip("Quantas vezes ele tenta achar um destino bom antes de desistir.")] public int tentativasDestino = 24;
    [Tooltip("Chance (0 a 1) de sair correndo por pressa quando vai passear.")] [Range(0f, 1f)] public float chanceDePressa = 0.15f;

    [Header("Humor e Necessidades")]
    [Tooltip("Quanto o cansaço sobe por segundo andando.")] public float taxaCansacoAndando = 0.8f;
    public float taxaCansacoCorrendo = 2.5f;
    [Tooltip("Quanto o tédio sobe por segundo.")] public float taxaTedio = 1f;
    public float recuperacaoCansacoSentado = 6f;
    public float recuperacaoTedioCelular = 5f;
    public float recuperacaoTedioConversa = 7f;

    [Header("Reação ao Jogador")]
    [Tooltip("Até que distância ele vira a cabeça para olhar você.")] public float distanciaVerJogador = 9f;
    [Tooltip("Se você ficar parado perto dele, ele acena.")] public float distanciaAcenar = 6f;
    [Tooltip("Quantos segundos você precisa ficar parado para ele acenar.")] public float tempoParadoParaAcenar = 2f;
    [Tooltip("Tempo mínimo entre um aceno e outro.")] public float recargaAcenar = 25f;

    [Header("Carros e Perigo")]
    [Tooltip("Se um carro rápido passar mais perto que isso, ele se assusta.")] public float distanciaSusto = 9f;
    [Tooltip("Velocidade (m/s) a partir da qual um carro é considerado perigoso. 7 = uns 25 km/h.")] public float velocidadeCarroPerigosa = 7f;
    public float tempoAssustado = 3f;
    [Tooltip("Ao atravessar, ele espera se houver carro vindo a menos que essa distância.")] public float distanciaVerCarro = 22f;

    [Header("Travessia de Rua")]
    [Tooltip("Até que distância ele procura o outro lado da rua.")] public float alcanceBuscaTravessia = 40f;
    [Tooltip("Se esperar mais que isso no meio-fio, desiste de atravessar.")] public float esperaMaximaTravessia = 12f;

    [Header("Conversa")]
    [Tooltip("Distância máxima para ele chamar outro NPC para conversar.")] public float distanciaConversa = 9f;
    [Tooltip("Distância entre os dois durante a conversa.")] public float distanciaFicarConversando = 1.7f;

    [Header("Praça e Fonte")]
    [Tooltip("Nome do objeto da fonte, criado pelo gerador da cidade.")] public string nomeObjetoFonte = "Fonte_Praca";
    [Tooltip("Distância da fonte onde ele senta.")] public float raioSentar = 2.4f;

    [Header("Dia e Noite (opcional)")]
    public bool usarRotinaDiaNoite = false;
    [Tooltip("Quantos segundos reais dura um dia de 24 horas do jogo.")] public float duracaoDiaSegundos = 600f;
    public float horaInicial = 9f;
    public float horaDormir = 22f;
    public float horaAcordar = 6f;

    [Header("Colisão")]
    [Tooltip("Liga uma colisão no NPC. Se o carro ficar parando ao bater nele, desmarque.")] public bool criarColisor = true;

    [Header("Depuração")]
    [Tooltip("Mostra destino e estado do NPC na aba Scene.")] public bool mostrarGizmos = true;

    // Nomes usados para reconhecer o chão (se mudar os nomes na cidade, mude aqui)
    public static string nomeCalcada = "Calcada";
    public static string nomeAsfalto = "Asfalto";

    // ---------------------------------------------------------------
    // ESTADO INTERNO
    // ---------------------------------------------------------------
    private Estado estado = Estado.Parado;
    public Estado EstadoAtual { get { return estado; } }

    private bool inicializado;
    private float tempoNoEstado;
    private float duracaoEstado;
    private bool travado;
    private float tempoChecagemTravado;
    private Vector3 posChecagem;

    private Vector3 destino;
    private bool temDestino;
    private TipoChao chaoAtual = TipoChao.Calcada;

    private float cansaco;
    private float tedio;
    private float individual = 1f;
    private float semente;

    private float yawAlvo;
    private float tempoOlhar;

    // Sentar
    private Vector3 destinoSentar;
    private int faseSentar;

    // Conversa
    private NpcVidaPropria parceiro;
    private int faseConversa;
    private float tempoFala;
    private float proximaConversaPermitida;

    // Travessia
    private int faseTravessia;
    private float tempoFase;
    private Vector3 cruzarInicio;
    private Vector3 cruzarFim;

    // Susto
    private Vector3 dirFuga = Vector3.forward;
    private float tempoProximoPerigo;

    // Jogador
    private bool olharJogador;
    private float yawParaJogador;
    private Vector3 dirParaJogador;
    private float tempoJogadorParado;
    private float proximoAcenoPermitido;
    private bool acenando;

    // Casa / noite
    private Vector3 casaPos;
    private bool emCasa;
    private bool indoParaCasa;
    private float tempoIndoCasa;
    private float tempoVerificarNoite;

    // Corpo e animação
    private Transform visual, cabeca, bracoDir, bracoEsq;
    private GameObject celularObj;
    private Collider colisorRaiz;
    private Vector3 posAnterior;
    private float velSuave;
    private float faseAndar;
    private float alturaVisual;
    private float yawCabeca, pitchCabeca;

    // Compartilhado entre todos os NPCs
    private static readonly List<NpcVidaPropria> todos = new List<NpcVidaPropria>();
    private static readonly List<Rigidbody> veiculos = new List<Rigidbody>();
    private static readonly List<Rigidbody> veiculosExtras = new List<Rigidbody>();
    private static readonly Dictionary<string, Material> materiais = new Dictionary<string, Material>();
    private static readonly RaycastHit[] bufChao = new RaycastHit[32];
    private static readonly RaycastHit[] bufObstaculo = new RaycastHit[16];
    private static readonly float[] angulosDesvio = { 0f, 35f, -35f, 70f, -70f, 110f, -110f };
    private static readonly Color[] peles =
    {
        new Color(0.96f, 0.80f, 0.69f), new Color(0.85f, 0.65f, 0.48f),
        new Color(0.66f, 0.46f, 0.32f), new Color(0.42f, 0.28f, 0.20f)
    };

    private static float proximaAtualizacaoVeiculos;
    private static Transform jogadorAtual;
    private static float proximaBuscaJogador;
    private static bool avisouJogador, jogadorJaVisto, avisouCalcada;
    private static Transform fonteGlobal;
    private static float proximaBuscaFonte;
    private static int frameVelJogador = -1;
    private static Vector3 posJogadorAnt;
    private static float velJogador;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetarEstatico()
    {
        todos.Clear(); veiculos.Clear(); veiculosExtras.Clear(); materiais.Clear();
        jogadorAtual = null; fonteGlobal = null;
        avisouJogador = false; jogadorJaVisto = false; avisouCalcada = false;
        proximaAtualizacaoVeiculos = 0f; proximaBuscaJogador = 0f; proximaBuscaFonte = 0f;
        frameVelJogador = -1; velJogador = 0f;
    }

    /// <summary>Se você tiver outros veículos (ex.: polícia) sem o CarroControle, registre o Rigidbody deles aqui.</summary>
    public static void RegistrarVeiculo(Rigidbody rb)
    {
        if (rb != null && !veiculosExtras.Contains(rb)) veiculosExtras.Add(rb);
    }

    // ---------------------------------------------------------------
    // INÍCIO
    // ---------------------------------------------------------------
    private void OnEnable()
    {
        if (!todos.Contains(this)) todos.Add(this);
    }

    private void OnDisable()
    {
        todos.Remove(this);
    }

    private void Start()
    {
        casaPos = transform.position;
        individual = Random.Range(0.85f, 1.15f);
        semente = Random.Range(0f, 100f);
        cansaco = Random.Range(0f, 40f);
        tedio = Random.Range(0f, 40f);
        tempoVerificarNoite = Random.Range(0f, 20f);

        ConstruirCorpo();
        if (criarColisor) AdicionarColisor();

        posAnterior = transform.position;
        posChecagem = transform.position;
        inicializado = true;

        EntrarEstado(Estado.Parado);
        duracaoEstado = Random.Range(0.2f, 3f); // pequeno atraso para cada NPC começar em um momento diferente
    }

    // ---------------------------------------------------------------
    // LOOP PRINCIPAL
    // ---------------------------------------------------------------
    private void Update()
    {
        if (!inicializado) return;
        float dt = Time.deltaTime;
        if (dt <= 0f) return;

        if (emCasa)
        {
            if (!EhNoite()) SairDeCasa();
            return;
        }

        AtualizarChaoAtual(dt);
        VerificarRotinaNoite(dt);
        AtualizarNecessidades(dt);
        VerificarPerigo(dt);

        tempoNoEstado += dt;
        switch (estado)
        {
            case Estado.Andando: AtualizarAndando(dt, false); break;
            case Estado.Correndo: AtualizarAndando(dt, true); break;
            case Estado.Parado: AtualizarParado(dt); break;
            case Estado.Celular: AtualizarCelular(dt); break;
            case Estado.Sentado: AtualizarSentado(dt); break;
            case Estado.Conversando: AtualizarConversando(dt); break;
            case Estado.Atravessando: AtualizarAtravessando(dt); break;
            case Estado.Assustado: AtualizarAssustado(dt); break;
        }

        ReagirAoJogador(dt);
        Separar(dt);
        AtualizarAnimacao(dt);
    }

    // ---------------------------------------------------------------
    // TROCA DE ESTADO
    // ---------------------------------------------------------------
    private void EntrarEstado(Estado novo)
    {
        if (estado == Estado.Conversando && novo != Estado.Conversando) LimparConversa();

        estado = novo;
        tempoNoEstado = 0f;
        travado = false;
        tempoChecagemTravado = 0f;
        posChecagem = transform.position;
        acenando = false;

        if (celularObj != null) celularObj.SetActive(novo == Estado.Celular);

        switch (novo)
        {
            case Estado.Parado:
                duracaoEstado = Random.Range(tempoParadoMin, tempoParadoMax);
                yawAlvo = transform.eulerAngles.y;
                tempoOlhar = Random.Range(0.5f, 1.5f);
                break;
            case Estado.Celular:
                duracaoEstado = Random.Range(tempoCelularMin, tempoCelularMax);
                break;
            case Estado.Sentado:
                faseSentar = 0;
                duracaoEstado = Random.Range(tempoSentadoMin, tempoSentadoMax);
                break;
            case Estado.Conversando:
                faseConversa = 0;
                duracaoEstado = Random.Range(tempoConversaMin, tempoConversaMax);
                break;
            case Estado.Atravessando:
                faseTravessia = 0;
                tempoFase = 0f;
                break;
            case Estado.Assustado:
                duracaoEstado = tempoAssustado;
                break;
        }
    }

    // ---------------------------------------------------------------
    // DECIDIR O QUE FAZER (o "cérebro")
    // ---------------------------------------------------------------
    private void Decidir()
    {
        if (indoParaCasa)
        {
            destino = casaPos; temDestino = true;
            EntrarEstado(Estado.Andando);
            return;
        }

        // Se estiver no meio da rua, o primeiro objetivo é sair dela correndo
        if (chaoAtual != TipoChao.Calcada && chaoAtual != TipoChao.Nenhum)
        {
            temDestino = false;
            EntrarEstado(Estado.Correndo);
            return;
        }

        float f = EhNoite() ? 0.3f : 1f;
        float[] pesos = new float[6];

        pesos[0] = 38f * f * Mathf.Clamp01(1f - cansaco / 150f);   // passear
        pesos[1] = 12f;                                             // ficar parado
        pesos[2] = 10f + tedio * 0.4f;                              // celular (tédio aumenta a vontade)

        bool podeSentar = PrepararSentar();
        pesos[3] = podeSentar ? 3f + Mathf.Max(0f, cansaco - 35f) : 0f; // sentar (cansaço aumenta a vontade)

        NpcVidaPropria par = Time.time >= proximaConversaPermitida ? ProcurarParceiro() : null;
        pesos[4] = par != null ? 16f + tedio * 0.2f : 0f;           // conversar

        pesos[5] = 14f * f;                                         // atravessar a rua

        switch (SortearPeso(pesos))
        {
            case 0:
                temDestino = false;
                EntrarEstado(Random.value < chanceDePressa ? Estado.Correndo : Estado.Andando);
                break;
            case 1: EntrarEstado(Estado.Parado); break;
            case 2: EntrarEstado(Estado.Celular); break;
            case 3: EntrarEstado(Estado.Sentado); break;
            case 4:
                parceiro = par;
                EntrarEstado(Estado.Conversando);
                par.ConvidarParaConversa(this);
                break;
            case 5:
                if (ProcurarTravessia()) EntrarEstado(Estado.Atravessando);
                else { temDestino = false; EntrarEstado(Estado.Andando); }
                break;
        }
    }

    private static int SortearPeso(float[] pesos)
    {
        float soma = 0f;
        for (int i = 0; i < pesos.Length; i++) soma += pesos[i];
        if (soma <= 0f) return 1;
        float r = Random.value * soma;
        for (int i = 0; i < pesos.Length; i++)
        {
            r -= pesos[i];
            if (r <= 0f) return i;
        }
        return 0;
    }

    // ---------------------------------------------------------------
    // ESTADOS
    // ---------------------------------------------------------------
    private void AtualizarAndando(float dt, bool correndo)
    {
        if (!temDestino && !EscolherNovoDestino())
        {
            EntrarEstado(Estado.Parado);
            return;
        }

        float vel = (correndo ? velocidadeCorrer : velocidadeAndar) * individual;
        if (!correndo && EhNoite()) vel *= 0.8f;

        bool chegou = MoverPara(destino, vel, true, 0.7f, dt);

        if (chegou)
        {
            temDestino = false;
            if (indoParaCasa)
            {
                if (PodeSumir()) EntrarEmCasa();
                else EntrarEstado(Estado.Parado);
                return;
            }
            Decidir();
        }
        else if (travado)
        {
            temDestino = false;
            EntrarEstado(Estado.Parado);
        }
        else if (correndo && cansaco > 90f)
        {
            EntrarEstado(Estado.Andando); // cansou de correr
        }
    }

    private void AtualizarParado(float dt)
    {
        if (acenando)
        {
            GirarPara(dirParaJogador, dt);
        }
        else
        {
            tempoOlhar -= dt;
            if (tempoOlhar <= 0f)
            {
                yawAlvo = transform.eulerAngles.y + Random.Range(-90f, 90f);
                tempoOlhar = Random.Range(1.5f, 3.5f);
            }
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.Euler(0f, yawAlvo, 0f), 90f * dt);
        }

        if (tempoNoEstado >= duracaoEstado)
        {
            acenando = false;
            Decidir();
        }
    }

    private void AtualizarCelular(float dt)
    {
        if (tempoNoEstado >= duracaoEstado) Decidir();
    }

    private void AtualizarSentado(float dt)
    {
        if (faseSentar == 0)
        {
            bool chegou = MoverPara(destinoSentar, velocidadeAndar * individual, true, 0.5f, dt);
            if (chegou)
            {
                faseSentar = 1;
                tempoNoEstado = 0f;
            }
            else if (travado || tempoNoEstado > 40f)
            {
                EntrarEstado(Estado.Parado);
            }
            return;
        }

        Transform f = ObterFonte();
        if (f != null) GirarPara(f.position - transform.position, dt);

        if (tempoNoEstado >= duracaoEstado)
        {
            EntrarEstado(Estado.Parado);
            duracaoEstado = 1f;
        }
    }

    private void AtualizarConversando(float dt)
    {
        if (parceiro == null || parceiro.emCasa || parceiro.estado != Estado.Conversando || parceiro.parceiro != this)
        {
            parceiro = null;
            EntrarEstado(Estado.Parado);
            return;
        }

        Vector3 d = parceiro.transform.position - transform.position;
        d.y = 0f;

        if (faseConversa == 0)
        {
            if (d.magnitude > distanciaFicarConversando)
            {
                MoverPara(parceiro.transform.position, velocidadeAndar * individual, true, distanciaFicarConversando, dt);
                if (travado || tempoNoEstado > 12f) EntrarEstado(Estado.Parado); // desistiu
                return;
            }
            faseConversa = 1;
            tempoFala = 0f;
        }

        GirarPara(d, dt);
        tempoFala += dt;
        if (tempoFala >= duracaoEstado) EntrarEstado(Estado.Parado);
    }

    private void AtualizarAtravessando(float dt)
    {
        switch (faseTravessia)
        {
            case 0: // vai até a beira da calçada
                if (MoverPara(cruzarInicio, velocidadeAndar * individual, true, 0.5f, dt))
                {
                    faseTravessia = 1;
                    tempoFase = 0f;
                }
                else if (travado || tempoNoEstado > 40f)
                {
                    EntrarEstado(Estado.Parado);
                }
                break;

            case 1: // olha para os lados e espera a rua ficar livre
                tempoFase += dt;
                GirarPara(cruzarFim - transform.position, dt);
                if (tempoFase > 0.8f && !TravessiaPerigosa())
                {
                    faseTravessia = 2;
                    tempoFase = 0f;
                }
                else if (tempoFase > esperaMaximaTravessia)
                {
                    EntrarEstado(Estado.Parado);
                }
                break;

            case 2: // atravessa (corre se aparecer carro)
                float vel = TravessiaPerigosa() ? velocidadeCorrer : velocidadeAndar * individual;
                if (MoverPara(cruzarFim, vel, false, 0.7f, dt))
                {
                    temDestino = false;
                    EntrarEstado(Estado.Andando);
                }
                else if (travado || tempoNoEstado > 60f)
                {
                    EntrarEstado(Estado.Parado);
                }
                break;
        }
    }

    private void AtualizarAssustado(float dt)
    {
        Vector3 alvo = transform.position + dirFuga * 4f;
        MoverPara(alvo, velocidadeCorrer * 1.15f, false, 0.05f, dt);

        if (travado)
        {
            dirFuga = Quaternion.Euler(0f, Random.Range(-90f, 90f), 0f) * dirFuga;
            travado = false;
            tempoChecagemTravado = 0f;
        }

        if (tempoNoEstado >= duracaoEstado)
        {
            temDestino = false;
            EntrarEstado(Estado.Parado);
            duracaoEstado = Random.Range(1f, 2.5f);
        }
    }

    // ---------------------------------------------------------------
    // MOVIMENTO
    // ---------------------------------------------------------------
    // Anda em direção ao alvo desviando de obstáculos. Retorna true quando chegou.
    private bool MoverPara(Vector3 alvo, float vel, bool respeitarCalcada, float raioChegada, float dt)
    {
        Vector3 para = alvo - transform.position;
        para.y = 0f;
        float dist = para.magnitude;
        if (dist <= raioChegada) return true;
        Vector3 dir = para / dist;

        Vector3 dirLivre;
        if (EscolherDirecaoLivre(dir, respeitarCalcada, out dirLivre))
        {
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(dirLivre), velocidadeGiro * dt);
            float alinhado = Mathf.Clamp01((Vector3.Dot(transform.forward, dirLivre) - 0.3f) / 0.7f);
            float passo = Mathf.Min(vel * dt * alinhado, dist);
            transform.position += transform.forward * passo;
        }

        // Detector de "travado": se quase não saiu do lugar em 1,5 segundo
        tempoChecagemTravado += dt;
        if (tempoChecagemTravado >= 1.5f)
        {
            Vector3 dp = transform.position - posChecagem;
            dp.y = 0f;
            if (dp.magnitude < vel * 0.25f) travado = true;
            posChecagem = transform.position;
            tempoChecagemTravado = 0f;
        }
        return false;
    }

    private bool EscolherDirecaoLivre(Vector3 dir, bool respeitar, out Vector3 livre)
    {
        for (int i = 0; i < angulosDesvio.Length; i++)
        {
            Vector3 d = Quaternion.Euler(0f, angulosDesvio[i], 0f) * dir;
            if (DirecaoLivre(d, respeitar))
            {
                livre = d;
                return true;
            }
        }
        livre = dir;
        return false;
    }

    private bool DirecaoLivre(Vector3 d, bool respeitar)
    {
        Vector3 origem = transform.position + Vector3.up * 0.6f;
        int n = Physics.SphereCastNonAlloc(origem, 0.25f, d, bufObstaculo, 0.9f, ~0, QueryTriggerInteraction.Ignore);
        for (int i = 0; i < n; i++)
        {
            Collider c = bufObstaculo[i].collider;
            if (IgnorarCollider(c, transform)) continue;
            TipoChao tc = ClassificarCollider(c);
            if (tc == TipoChao.Calcada || tc == TipoChao.Asfalto) continue; // chão não é obstáculo
            return false; // prédio, árvore, poste, fonte...
        }

        // Não deixa o NPC sair da calçada para a rua sem querer
        if (respeitar && chaoAtual == TipoChao.Calcada)
        {
            Vector3 ponto;
            TipoChao t = ClassificarChao(transform.position + d * 0.9f, 1f, 3f, transform, out ponto);
            if (t != TipoChao.Calcada) return false;
        }
        return true;
    }

    private void GirarPara(Vector3 dir, float dt)
    {
        dir.y = 0f;
        if (dir.sqrMagnitude < 0.0001f) return;
        transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(dir), 300f * dt);
    }

    // Empurra um pouquinho para longe de outros NPCs (para não ficarem um dentro do outro)
    private void Separar(float dt)
    {
        Vector3 empurrao = Vector3.zero;
        Vector3 meu = transform.position;
        for (int i = 0; i < todos.Count; i++)
        {
            NpcVidaPropria o = todos[i];
            if (o == null || o == this || o.emCasa || o == parceiro) continue;
            Vector3 d = meu - o.transform.position;
            d.y = 0f;
            float m = d.magnitude;
            if (m < 0.75f && m > 0.001f) empurrao += d / m * (0.75f - m);
        }
        if (empurrao != Vector3.zero) transform.position += empurrao * (dt * 3f);
    }

    // ---------------------------------------------------------------
    // CHÃO
    // ---------------------------------------------------------------
    private void AtualizarChaoAtual(float dt)
    {
        Vector3 ponto;
        TipoChao t = ClassificarChao(transform.position, 1f, 3f, transform, out ponto);
        if (t == TipoChao.Nenhum) return;

        chaoAtual = t;
        Vector3 p = transform.position;
        p.y = Mathf.Lerp(p.y, ponto.y, 1f - Mathf.Exp(-14f * dt));
        transform.position = p;
    }

    private static bool IgnorarCollider(Collider c, Transform eu)
    {
        if (c == null) return true;
        Transform t = c.transform;
        if (eu != null && t.IsChildOf(eu)) return true;
        if (c.GetComponentInParent<NpcVidaPropria>() != null) return true;
        if (c.GetComponentInParent<CarroControle>() != null) return true;
        if (jogadorAtual != null && t.IsChildOf(jogadorAtual)) return true;
        return false;
    }

    private static TipoChao ClassificarCollider(Collider c)
    {
        string n = c.name;
        if (n.StartsWith(nomeCalcada)) return TipoChao.Calcada;
        if (n.Contains(nomeAsfalto)) return TipoChao.Asfalto;
        return TipoChao.Outro;
    }

    // Joga um raio para baixo e diz que tipo de chão foi atingido
    private static TipoChao ClassificarChao(Vector3 pos, float acima, float alcance, Transform eu, out Vector3 ponto)
    {
        ponto = pos;
        Vector3 origem = pos + Vector3.up * acima;
        int n = Physics.RaycastNonAlloc(origem, Vector3.down, bufChao, acima + alcance, ~0, QueryTriggerInteraction.Ignore);

        float melhor = float.MaxValue;
        int idx = -1;
        for (int i = 0; i < n; i++)
        {
            if (IgnorarCollider(bufChao[i].collider, eu)) continue;
            if (bufChao[i].distance < melhor)
            {
                melhor = bufChao[i].distance;
                idx = i;
            }
        }
        if (idx < 0) return TipoChao.Nenhum;

        ponto = bufChao[idx].point;
        return ClassificarCollider(bufChao[idx].collider);
    }

    // Olha o ponto "de cima do céu" para baixo (ignora o que está em cima de prédios etc.)
    private TipoChao ClassificarTopo(Vector3 xz, out Vector3 ponto)
    {
        return ClassificarChao(new Vector3(xz.x, transform.position.y, xz.z), 70f, 100f, transform, out ponto);
    }

    /// <summary>Usado pelo GeradorDeNpcs: diz se naquele ponto (x,z) existe calçada.</summary>
    public static bool TentarAcharCalcada(Vector3 xz, out Vector3 ponto)
    {
        return ClassificarChao(new Vector3(xz.x, 0f, xz.z), 70f, 100f, null, out ponto) == TipoChao.Calcada;
    }

    // Confere se a linha reta de A até B passa só por calçada
    private bool LinhaDeCalcada(Vector3 a, Vector3 b, bool permitirAsfaltoNoInicio)
    {
        float dist = Vector3.Distance(a, b);
        int passos = Mathf.Max(1, Mathf.CeilToInt(dist / 1.2f));
        bool viuCalcada = !permitirAsfaltoNoInicio;

        for (int i = 1; i <= passos; i++)
        {
            Vector3 p = Vector3.Lerp(a, b, i / (float)passos);
            Vector3 pt;
            TipoChao t = ClassificarTopo(p, out pt);
            if (t == TipoChao.Calcada) viuCalcada = true;
            else if (t == TipoChao.Asfalto && !viuCalcada) continue;
            else return false;
        }
        return viuCalcada;
    }

    private bool EscolherNovoDestino()
    {
        bool dePista = chaoAtual != TipoChao.Calcada;
        Vector3[] eixos = { Vector3.forward, Vector3.back, Vector3.right, Vector3.left };

        for (int i = 0; i < tentativasDestino; i++)
        {
            Vector3 alvoXZ;
            if (Random.value < 0.6f)
            {
                // Anda em linha reta nos eixos (as calçadas são alinhadas com a grade da cidade)
                alvoXZ = transform.position + eixos[Random.Range(0, 4)] * Random.Range(4f, raioDestino);
            }
            else
            {
                Vector2 c = Random.insideUnitCircle * raioDestino;
                if (c.sqrMagnitude < 16f) c = (c.sqrMagnitude > 0.0001f ? c.normalized : Vector2.right) * 4f;
                alvoXZ = transform.position + new Vector3(c.x, 0f, c.y);
            }

            Vector3 pt;
            if (ClassificarTopo(alvoXZ, out pt) != TipoChao.Calcada) continue;
            if (!LinhaDeCalcada(transform.position, pt, dePista)) continue;

            destino = pt;
            temDestino = true;
            return true;
        }

        if (!avisouCalcada && Time.timeSinceLevelLoad > 8f && chaoAtual != TipoChao.Calcada)
        {
            avisouCalcada = true;
            Debug.LogWarning("[NpcVidaPropria] Um NPC não achou calçada por perto. Confira se o chão da cidade tem objetos chamados 'Calcada' e 'Asfalto' e se a calçada está larga (Recuo Calcada = 3).");
        }
        return false;
    }

    // ---------------------------------------------------------------
    // SENTAR, CONVERSAR, ATRAVESSAR
    // ---------------------------------------------------------------
    private Transform ObterFonte()
    {
        if (fonteGlobal != null) return fonteGlobal;
        if (Time.time >= proximaBuscaFonte)
        {
            proximaBuscaFonte = Time.time + 3f;
            GameObject g = GameObject.Find(nomeObjetoFonte);
            if (g != null) fonteGlobal = g.transform;
        }
        return fonteGlobal;
    }

    private bool PrepararSentar()
    {
        Transform f = ObterFonte();
        if (f == null) return false;

        Vector3 c = f.position;
        Vector3 d = c - transform.position;
        d.y = 0f;
        if (d.magnitude > 60f) return false;

        bool dePista = chaoAtual != TipoChao.Calcada;
        float a0 = Random.Range(0f, 360f);
        for (int i = 0; i < 6; i++)
        {
            float a = (a0 + i * 60f) * Mathf.Deg2Rad;
            Vector3 p = c + new Vector3(Mathf.Cos(a), 0f, Mathf.Sin(a)) * raioSentar;
            Vector3 pt;
            if (ClassificarTopo(p, out pt) != TipoChao.Calcada) continue;
            if (!LinhaDeCalcada(transform.position, pt, dePista)) continue;
            destinoSentar = pt;
            return true;
        }
        return false;
    }

    private NpcVidaPropria ProcurarParceiro()
    {
        NpcVidaPropria melhor = null;
        float menor = distanciaConversa * distanciaConversa;

        for (int i = 0; i < todos.Count; i++)
        {
            NpcVidaPropria o = todos[i];
            if (o == null || o == this || o.emCasa || !o.inicializado) continue;
            if (o.estado != Estado.Andando && o.estado != Estado.Parado && o.estado != Estado.Celular) continue;
            if (Time.time < o.proximaConversaPermitida) continue;

            Vector3 d = o.transform.position - transform.position;
            if (Mathf.Abs(d.y) > 1.5f) continue;
            d.y = 0f;
            float s = d.sqrMagnitude;
            if (s < menor)
            {
                if (!LinhaDeCalcada(transform.position, o.transform.position, false)) continue;
                menor = s;
                melhor = o;
            }
        }
        return melhor;
    }

    private void ConvidarParaConversa(NpcVidaPropria quem)
    {
        parceiro = quem;
        temDestino = false;
        EntrarEstado(Estado.Conversando);
    }

    private void LimparConversa()
    {
        NpcVidaPropria p = parceiro;
        parceiro = null;
        proximaConversaPermitida = Time.time + 20f;
        tedio = Mathf.Max(0f, tedio - 15f);

        if (p != null && p.parceiro == this && p.estado == Estado.Conversando)
        {
            p.parceiro = null;
            p.EntrarEstado(Estado.Parado);
        }
    }

    // Procura o outro lado da rua em linha reta (norte, sul, leste, oeste)
    private bool ProcurarTravessia()
    {
        Vector3 pos = transform.position;
        Vector3[] dirs = { Vector3.forward, Vector3.back, Vector3.right, Vector3.left };
        for (int i = 3; i > 0; i--)
        {
            int j = Random.Range(0, i + 1);
            Vector3 tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
        }

        for (int k = 0; k < dirs.Length; k++)
        {
            Vector3 d = dirs[k];
            bool viuAsfalto = false;
            Vector3 ultimaCalcada = pos;

            for (float s = 1f; s <= alcanceBuscaTravessia; s += 1f)
            {
                Vector3 pt;
                TipoChao t = ClassificarTopo(pos + d * s, out pt);

                if (t == TipoChao.Calcada)
                {
                    if (!viuAsfalto)
                    {
                        ultimaCalcada = pt;
                    }
                    else
                    {
                        Vector3 pa;
                        if (ClassificarTopo(pos + d * (s + 2f), out pa) == TipoChao.Calcada)
                        {
                            cruzarInicio = ultimaCalcada - d * 0.6f;
                            cruzarFim = pa;
                            return true;
                        }
                        break;
                    }
                }
                else if (t == TipoChao.Asfalto)
                {
                    viuAsfalto = true;
                }
                else
                {
                    break; // prédio, árvore etc. no caminho
                }
            }
        }
        return false;
    }

    private bool TravessiaPerigosa()
    {
        Vector3 a = transform.position;
        Vector3 b = cruzarFim;
        List<Rigidbody> vs = Veiculos();

        for (int i = 0; i < vs.Count; i++)
        {
            Rigidbody rb = vs[i];
            if (rb == null) continue;

            Vector3 v = rb.linearVelocity;
            v.y = 0f;
            float vel = v.magnitude;
            if (vel < 1.5f) continue; // carro parado não é perigo

            Vector3 cp = rb.position;
            Vector3 q = PontoMaisProximo(a, b, cp);
            Vector3 ate = q - cp;
            ate.y = 0f;
            float dist = ate.magnitude;

            if (dist > distanciaVerCarro) continue;
            if (dist < 5f) return true;
            if (Vector3.Dot(v.normalized, ate / dist) > 0.3f) return true; // vindo na direção da travessia
        }
        return false;
    }

    private static Vector3 PontoMaisProximo(Vector3 a, Vector3 b, Vector3 p)
    {
        Vector3 ab = b - a;
        float t = Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 0.0001f);
        return a + ab * Mathf.Clamp01(t);
    }

    // ---------------------------------------------------------------
    // CARROS E SUSTO
    // ---------------------------------------------------------------
    private static List<Rigidbody> Veiculos()
    {
        if (Time.time >= proximaAtualizacaoVeiculos)
        {
            proximaAtualizacaoVeiculos = Time.time + 1f;
            veiculos.Clear();

            CarroControle[] carros = Object.FindObjectsByType<CarroControle>(FindObjectsSortMode.None);
            for (int i = 0; i < carros.Length; i++)
            {
                Rigidbody rb = carros[i].GetComponent<Rigidbody>();
                if (rb != null) veiculos.Add(rb);
            }
            for (int i = 0; i < veiculosExtras.Count; i++)
                if (veiculosExtras[i] != null) veiculos.Add(veiculosExtras[i]);
        }
        return veiculos;
    }

    private void VerificarPerigo(float dt)
    {
        if (estado == Estado.Assustado) return;
        tempoProximoPerigo -= dt;
        if (tempoProximoPerigo > 0f) return;
        tempoProximoPerigo = 0.1f;

        List<Rigidbody> vs = Veiculos();
        Vector3 meu = transform.position;

        for (int i = 0; i < vs.Count; i++)
        {
            Rigidbody rb = vs[i];
            if (rb == null) continue;

            Vector3 d = meu - rb.position;
            d.y = 0f;
            float dist = d.magnitude;
            if (dist > distanciaSusto || dist < 0.01f) continue;

            Vector3 v = rb.linearVelocity;
            v.y = 0f;
            float vel = v.magnitude;

            bool rapido = vel >= velocidadeCarroPerigosa;
            bool muitoPerto = vel > 2.5f && dist < 2.8f;
            if (!rapido && !muitoPerto) continue;

            float aproximando = vel > 0.1f ? Vector3.Dot(v.normalized, d / dist) : 0f;
            if (aproximando < 0.35f && !muitoPerto) continue;

            Assustar(rb.position, v);
            return;
        }
    }

    private void Assustar(Vector3 origemPerigo, Vector3 velCarro)
    {
        Vector3 fuga = transform.position - origemPerigo;
        fuga.y = 0f;
        fuga = fuga.sqrMagnitude > 0.0001f ? fuga.normalized : transform.forward;

        if (velCarro.sqrMagnitude > 0.25f)
        {
            // Foge para o lado (de lado o carro não te pega)
            Vector3 perp = Vector3.Cross(Vector3.up, velCarro.normalized);
            if (Vector3.Dot(perp, fuga) < 0f) perp = -perp;
            dirFuga = (perp * 0.8f + fuga * 0.5f).normalized;
        }
        else
        {
            dirFuga = fuga;
        }

        temDestino = false;
        EntrarEstado(Estado.Assustado);
    }

    // ---------------------------------------------------------------
    // JOGADOR
    // ---------------------------------------------------------------
    private static Transform ObterJogador()
    {
        if (jogadorAtual != null && jogadorAtual.gameObject.activeInHierarchy) return jogadorAtual;

        if (Time.time >= proximaBuscaJogador)
        {
            proximaBuscaJogador = Time.time + 2f;
            try
            {
                GameObject g = GameObject.FindGameObjectWithTag("Player");
                if (g != null)
                {
                    jogadorAtual = g.transform;
                    jogadorJaVisto = true;
                }
            }
            catch (UnityException)
            {
                if (!avisouJogador)
                {
                    avisouJogador = true;
                    Debug.LogWarning("[NpcVidaPropria] A tag 'Player' não existe no projeto. Os NPCs não vão reagir ao jogador.");
                }
            }

            if (jogadorAtual == null && !jogadorJaVisto && !avisouJogador && Time.time > 5f)
            {
                avisouJogador = true;
                Debug.LogWarning("[NpcVidaPropria] Não achei nenhum objeto com a tag 'Player'. Selecione seu jogador e escolha a Tag 'Player' no Inspector. Sem isso, os NPCs não reagem a você.");
            }
        }

        return (jogadorAtual != null && jogadorAtual.gameObject.activeInHierarchy) ? jogadorAtual : null;
    }

    private static float VelocidadeJogador()
    {
        if (Time.frameCount == frameVelJogador) return velJogador;
        frameVelJogador = Time.frameCount;

        Transform j = ObterJogador();
        if (j == null) { velJogador = 99f; return velJogador; }

        float dt = Mathf.Max(Time.deltaTime, 0.0001f);
        Vector3 d = j.position - posJogadorAnt;
        d.y = 0f;
        posJogadorAnt = j.position;
        float v = d.magnitude / dt;
        if (v > 60f) v = 0f; // teletransporte
        velJogador = Mathf.Lerp(velJogador, v, 0.3f);
        return velJogador;
    }

    private void ReagirAoJogador(float dt)
    {
        olharJogador = false;
        Transform j = ObterJogador();
        if (j == null) { tempoJogadorParado = 0f; return; }

        Vector3 d = j.position - transform.position;
        d.y = 0f;
        float dist = d.magnitude;
        if (dist > distanciaVerJogador) { tempoJogadorParado = 0f; return; }

        olharJogador = true;
        dirParaJogador = d;
        Vector3 local = transform.InverseTransformDirection(d);
        yawParaJogador = Mathf.Clamp(Mathf.Atan2(local.x, local.z) * Mathf.Rad2Deg, -80f, 80f);

        if (VelocidadeJogador() < 0.3f) tempoJogadorParado += dt;
        else tempoJogadorParado = 0f;

        bool livre = estado == Estado.Andando || estado == Estado.Parado || estado == Estado.Celular;
        if (livre && !acenando && dist < distanciaAcenar
            && tempoJogadorParado >= tempoParadoParaAcenar && Time.time >= proximoAcenoPermitido)
        {
            proximoAcenoPermitido = Time.time + recargaAcenar;
            EntrarEstado(Estado.Parado);
            acenando = true;
            duracaoEstado = 3.2f;
        }
    }

    // ---------------------------------------------------------------
    // NECESSIDADES E ROTINA
    // ---------------------------------------------------------------
    private void AtualizarNecessidades(float dt)
    {
        switch (estado)
        {
            case Estado.Andando:
            case Estado.Atravessando:
                cansaco += taxaCansacoAndando * dt;
                tedio += taxaTedio * 0.5f * dt;
                break;
            case Estado.Correndo:
            case Estado.Assustado:
                cansaco += taxaCansacoCorrendo * dt;
                break;
            case Estado.Parado:
                tedio += taxaTedio * dt;
                cansaco -= 0.5f * dt;
                break;
            case Estado.Sentado:
                if (faseSentar == 1) cansaco -= recuperacaoCansacoSentado * dt;
                tedio += taxaTedio * 0.3f * dt;
                break;
            case Estado.Celular:
                tedio -= recuperacaoTedioCelular * dt;
                break;
            case Estado.Conversando:
                if (faseConversa == 1) tedio -= recuperacaoTedioConversa * dt;
                break;
        }
        cansaco = Mathf.Clamp(cansaco, 0f, 100f);
        tedio = Mathf.Clamp(tedio, 0f, 100f);
    }

    private float Hora()
    {
        return (horaInicial + Time.time / Mathf.Max(1f, duracaoDiaSegundos) * 24f) % 24f;
    }

    private bool EhNoite()
    {
        if (!usarRotinaDiaNoite) return false;
        float h = Hora();
        if (horaDormir > horaAcordar) return h >= horaDormir || h < horaAcordar;
        return h >= horaDormir && h < horaAcordar;
    }

    private void VerificarRotinaNoite(float dt)
    {
        if (!usarRotinaDiaNoite) { indoParaCasa = false; return; }

        if (!EhNoite()) { indoParaCasa = false; return; }

        if (!indoParaCasa)
        {
            if (estado == Estado.Conversando || estado == Estado.Assustado || estado == Estado.Atravessando) return;

            tempoVerificarNoite -= dt;
            if (tempoVerificarNoite <= 0f)
            {
                tempoVerificarNoite = Random.Range(1f, 15f);
                indoParaCasa = true;
                tempoIndoCasa = 0f;
                destino = casaPos;
                temDestino = true;
                EntrarEstado(Estado.Andando);
            }
        }
        else
        {
            tempoIndoCasa += dt;
            if (tempoIndoCasa > 45f)
            {
                if (PodeSumir()) EntrarEmCasa();
                else tempoIndoCasa = 30f;
            }
        }
    }

    // Só some quando o jogador não está por perto (para não sumir na sua cara)
    private bool PodeSumir()
    {
        Transform j = ObterJogador();
        return j == null || (j.position - transform.position).sqrMagnitude > 20f * 20f;
    }

    private void EntrarEmCasa()
    {
        emCasa = true;
        indoParaCasa = false;
        temDestino = false;
        if (visual != null) visual.gameObject.SetActive(false);
        if (colisorRaiz != null) colisorRaiz.enabled = false;
    }

    private void SairDeCasa()
    {
        emCasa = false;
        indoParaCasa = false;
        temDestino = false;
        if (visual != null) visual.gameObject.SetActive(true);
        if (colisorRaiz != null) colisorRaiz.enabled = true;
        EntrarEstado(Estado.Parado);
    }

    // ---------------------------------------------------------------
    // CORPO (cápsula + cabeça + braços) E ANIMAÇÃO
    // ---------------------------------------------------------------
    private void ConstruirCorpo()
    {
        GameObject v = new GameObject("Visual");
        visual = v.transform;
        visual.SetParent(transform, false);

        // 1) Modelo seu
        if (modeloPersonalizado != null)
        {
            GameObject m = Instantiate(modeloPersonalizado, visual);
            m.transform.localPosition = Vector3.zero;
            m.transform.localRotation = Quaternion.identity;
            RemoverColliders(m);
            return;
        }

        // 2) Se este objeto já tem um modelo dentro, aproveita ele
        Renderer[] existentes = GetComponentsInChildren<Renderer>(true);
        if (existentes.Length > 0)
        {
            List<Transform> filhos = new List<Transform>();
            foreach (Transform f in transform) if (f != visual) filhos.Add(f);
            for (int i = 0; i < filhos.Count; i++) filhos[i].SetParent(visual, true);
            return;
        }
        // 3) Boneco detalhado com variações aleatórias
        if (usarCorpoDetalhado) { ConstruirCorpoDetalhado(); return; }

        // 3) Cápsula colorida
        Color roupa = (coresDeRoupa != null && coresDeRoupa.Length > 0)
            ? coresDeRoupa[Random.Range(0, coresDeRoupa.Length)]
            : Color.gray;
        Color pele = peles[Random.Range(0, peles.Length)];

        Criar(PrimitiveType.Capsule, "Corpo", visual, new Vector3(0f, 0.65f, 0f), new Vector3(0.6f, 0.65f, 0.6f), roupa);

        GameObject cab = new GameObject("Cabeca");
        cabeca = cab.transform;
        cabeca.SetParent(visual, false);
        cabeca.localPosition = new Vector3(0f, 1.45f, 0f);
        Criar(PrimitiveType.Sphere, "Cranio", cabeca, Vector3.zero, new Vector3(0.34f, 0.34f, 0.34f), pele);
        Criar(PrimitiveType.Cube, "Nariz", cabeca, new Vector3(0f, 0f, 0.17f), new Vector3(0.06f, 0.06f, 0.1f),
              new Color(pele.r * 0.85f, pele.g * 0.85f, pele.b * 0.85f));

        bracoDir = CriarBraco("BracoDir", 0.38f, roupa);
        bracoEsq = CriarBraco("BracoEsq", -0.38f, roupa);

        celularObj = Criar(PrimitiveType.Cube, "Celular", visual, new Vector3(0.12f, 1.0f, 0.34f),
                           new Vector3(0.1f, 0.18f, 0.02f), new Color(0.08f, 0.08f, 0.1f)).gameObject;
        celularObj.SetActive(false);
    }

    private Transform CriarBraco(string nome, float x, Color cor)
    {
        GameObject pivo = new GameObject(nome);
        pivo.transform.SetParent(visual, false);
        pivo.transform.localPosition = new Vector3(x, 1.15f, 0f);
        Criar(PrimitiveType.Capsule, "Braco", pivo.transform, new Vector3(0f, -0.25f, 0f), new Vector3(0.12f, 0.25f, 0.12f), cor);
        return pivo.transform;
    }

    private Transform Criar(PrimitiveType tipo, string nome, Transform pai, Vector3 pos, Vector3 escala, Color cor)
    {
        GameObject g = GameObject.CreatePrimitive(tipo);
        g.name = nome;
        Collider c = g.GetComponent<Collider>();
        if (c != null) Destroy(c);
        g.transform.SetParent(pai, false);
        g.transform.localPosition = pos;
        g.transform.localScale = escala;

        Renderer r = g.GetComponent<Renderer>();
        if (r != null)
        {
            Material m = ObterMaterial(r.sharedMaterial, cor);
            if (m != null) r.sharedMaterial = m;
        }
        return g.transform;
    }

    private static Material ObterMaterial(Material baseMat, Color cor)
    {
        string chave = ColorUtility.ToHtmlStringRGB(cor);
        Material existente;
        if (materiais.TryGetValue(chave, out existente) && existente != null) return existente;

        Material m;
        if (baseMat != null)
        {
            m = new Material(baseMat);
        }
        else
        {
            Shader s = Shader.Find("Standard");
            if (s == null) return null;
            m = new Material(s);
        }
        m.name = "Npc_" + chave;
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", cor);
        if (m.HasProperty("_Color")) m.SetColor("_Color", cor);

        materiais[chave] = m;
        return m;
    }

    private static void RemoverColliders(GameObject go)
    {
        Collider[] cols = go.GetComponentsInChildren<Collider>(true);
        for (int i = 0; i < cols.Length; i++) Destroy(cols[i]);
    }

    private void AdicionarColisor()
    {
        CapsuleCollider cc = gameObject.AddComponent<CapsuleCollider>();
        cc.center = new Vector3(0f, 0.85f, 0f);
        cc.height = 1.7f;
        cc.radius = 0.3f;
        colisorRaiz = cc;

        Rigidbody rb = gameObject.GetComponent<Rigidbody>();
        if (rb == null) rb = gameObject.AddComponent<Rigidbody>();
        rb.isKinematic = true;
        rb.useGravity = false;
    }

    private void AtualizarAnimacao(float dt)
    {
        if (visual == null) return;

        // Velocidade real (para balançar ao andar)
        Vector3 d = transform.position - posAnterior;
        d.y = 0f;
        float v = d.magnitude / dt;
        if (v > 20f) v = 0f;
        velSuave = Mathf.Lerp(velSuave, v, 1f - Mathf.Exp(-10f * dt));
        posAnterior = transform.position;

        float anda = Mathf.Clamp01(velSuave / 1f);
        faseAndar += velSuave * 2.4f * dt;

        bool sentadoAgora = estado == Estado.Sentado && faseSentar == 1;
        alturaVisual = Mathf.Lerp(alturaVisual, sentadoAgora ? -0.45f : 0f, 1f - Mathf.Exp(-8f * dt));

        float bob = Mathf.Abs(Mathf.Sin(faseAndar)) * 0.05f * anda;
        visual.localPosition = new Vector3(0f, alturaVisual + bob, 0f);
        visual.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(faseAndar) * 2.5f * anda);

        // Braços
        float balanco = Mathf.Sin(faseAndar) * 35f * anda;
        Vector3 angDir = new Vector3(balanco, 0f, 6f);
        Vector3 angEsq = new Vector3(-balanco, 0f, -6f);

        if (acenando)
            angDir = new Vector3(0f, 0f, 150f + Mathf.Sin(Time.time * 11f) * 22f);
        else if (estado == Estado.Conversando && faseConversa == 1)
            angDir = new Vector3(0f, 0f, 35f + Mathf.Sin(Time.time * 3f + semente) * 25f);
        else if (estado == Estado.Celular)
            angDir = new Vector3(-50f, 0f, 10f);
        else if (estado == Estado.Assustado)
        {
            angDir = new Vector3(0f, 0f, 110f + Mathf.Sin(Time.time * 18f) * 15f);
            angEsq = new Vector3(0f, 0f, -110f - Mathf.Sin(Time.time * 18f) * 15f);
        }

        float t = 1f - Mathf.Exp(-12f * dt);
        if (bracoDir != null) bracoDir.localRotation = Quaternion.Slerp(bracoDir.localRotation, Quaternion.Euler(angDir), t);
        if (bracoEsq != null) bracoEsq.localRotation = Quaternion.Slerp(bracoEsq.localRotation, Quaternion.Euler(angEsq), t);

        // Cabeça
        if (cabeca != null)
        {
            float alvoYaw = 0f;
            float alvoPitch = 0f;

            if (olharJogador) alvoYaw = yawParaJogador;
            else if (estado == Estado.Parado) alvoYaw = Mathf.Sin(Time.time * 0.8f + semente) * 30f;

            if (estado == Estado.Atravessando && faseTravessia == 1) alvoYaw = Mathf.Sin(Time.time * 2.2f) * 60f;
            if (estado == Estado.Celular) alvoPitch = 35f;

            float th = 1f - Mathf.Exp(-6f * dt);
            yawCabeca = Mathf.Lerp(yawCabeca, alvoYaw, th);
            pitchCabeca = Mathf.Lerp(pitchCabeca, alvoPitch, th);
                     cabeca.localRotation = Quaternion.Euler(pitchCabeca, yawCabeca, 0f);
            AnimarPartesDetalhadas(dt);
        }
    }

    // ---------------------------------------------------------------
    // DEPURAÇÃO (aba Scene)
    // ---------------------------------------------------------------
    private void OnDrawGizmos()
    {
        if (!mostrarGizmos || !Application.isPlaying || !inicializado || emCasa) return;

        Color cor = Color.white;
        switch (estado)
        {
            case Estado.Andando: cor = Color.green; break;
            case Estado.Correndo: cor = new Color(1f, 0.6f, 0f); break;
            case Estado.Assustado: cor = Color.red; break;
            case Estado.Atravessando: cor = Color.cyan; break;
            case Estado.Conversando: cor = Color.magenta; break;
            case Estado.Sentado: cor = Color.blue; break;
            case Estado.Celular: cor = Color.yellow; break;
        }
        Gizmos.color = cor;

        Vector3 alto = transform.position + Vector3.up * 0.4f;
        if ((estado == Estado.Andando || estado == Estado.Correndo) && temDestino)
        {
            Gizmos.DrawLine(alto, destino + Vector3.up * 0.4f);
            Gizmos.DrawWireSphere(destino + Vector3.up * 0.4f, 0.4f);
        }
        if (estado == Estado.Atravessando)
        {
            Gizmos.DrawLine(alto, cruzarInicio + Vector3.up * 0.4f);
            Gizmos.DrawLine(cruzarInicio + Vector3.up * 0.4f, cruzarFim + Vector3.up * 0.4f);
            Gizmos.DrawWireSphere(cruzarFim + Vector3.up * 0.4f, 0.4f);
        }
        if (estado == Estado.Sentado && faseSentar == 0)
        {
            Gizmos.DrawLine(alto, destinoSentar + Vector3.up * 0.4f);
            Gizmos.DrawWireSphere(destinoSentar + Vector3.up * 0.4f, 0.4f);
        }

#if UNITY_EDITOR
        Handles.color = cor;
        Handles.Label(transform.position + Vector3.up * 2.3f,
            estado + (acenando ? " (acenando)" : "") + "\ncansaço " + cansaco.ToString("0") + "  tédio " + tedio.ToString("0"));
#endif
    }
}