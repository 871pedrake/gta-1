using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

/// <summary>
/// Câmera em terceira pessoa estilo GTA:
///  - Gira com o mouse (órbita ao redor do alvo, cursor travado)
///  - Câmera sobre o ombro, com zoom pela rodinha do mouse
///  - Colisão com paredes e prédios (a câmera nunca atravessa)
///  - FOV aumenta com a velocidade (sensação de velocidade)
///  - Perfil separado para andando e para veículo (com recentralização atrás do carro)
///  - Transição suave ao trocar de alvo (jogador <-> carro)
///
/// USO:
///  1) Anexe na Main Camera e DESATIVE/REMOVA seu script de câmera antigo (CameraSeg...).
///  2) Arraste o jogador em "Alvo" (ou deixe a tag "Player" no jogador).
///  3) Ao entrar/sair do carro, chame: cameraGTA.TrocarAlvo(carro.transform, true) / (jogador.transform, false)
///
/// Funciona com o Input System novo e com o antigo.
/// </summary>
[RequireComponent(typeof(Camera))]
[DisallowMultipleComponent]
public class CameraGTA : MonoBehaviour
{
    [System.Serializable]
    public class PerfilCamera
    {
        [Tooltip("Distância padrão atrás do alvo.")] public float distancia = 4.2f;
        public float distanciaMin = 2.0f;
        public float distanciaMax = 8.0f;
        [Tooltip("Altura do ponto que a câmera mira, acima do pivô do alvo.")] public float alturaFoco = 1.6f;
        [Tooltip("Deslocamento lateral (sobre o ombro). Positivo = ombro direito.")] public float offsetOmbro = 0.55f;
        public float fovBase = 60f;
        [Tooltip("FOV extra adicionado na velocidade máxima.")] public float fovExtraVelocidade = 10f;
        [Tooltip("Velocidade (m/s) em que o FOV extra chega ao máximo.")] public float velocidadeMaxFov = 12f;
        [Tooltip("Recentraliza atrás do alvo quando ele anda e o mouse está parado.")] public bool recentrarAtras = false;
        public float pitchPadrao = 12f;
    }

    [Header("Alvo")]
    public Transform alvo;
    public bool procurarJogadorPorTag = true;
    public string tagJogador = "Player";
    public bool modoVeiculo = false;

    [Header("Perfis")]
    public PerfilCamera perfilAndando = new PerfilCamera();
    public PerfilCamera perfilVeiculo = new PerfilCamera
    {
        distancia = 7.5f,
        distanciaMin = 4.5f,
        distanciaMax = 14f,
        alturaFoco = 1.6f,
        offsetOmbro = 0f,
        fovBase = 65f,
        fovExtraVelocidade = 22f,
        velocidadeMaxFov = 35f,
        recentrarAtras = true,
        pitchPadrao = 10f
    };

    [Header("Mouse")]
    [Tooltip("Graus por pixel de movimento do mouse.")] public float sensibilidadeX = 0.10f;
    public float sensibilidadeY = 0.08f;
    public bool inverterY = false;
    [Range(0f, 40f)] [Tooltip("0 = sem suavização. Valores altos = mais lag, mais 'cinematográfico'.")]
    public float suavizacaoMouse = 0f;
    public float pitchMin = -30f;
    public float pitchMax = 70f;
    public bool travarCursor = true;

    [Header("Zoom")]
    public float velocidadeZoom = 0.8f;
    public float suavizacaoZoom = 8f;

    [Header("Suavização")]
    [Tooltip("Tempo de suavização do ponto de foco. Menor = mais colado no alvo.")] public float suavizacaoPivo = 0.04f;
    public float suavizacaoPerfil = 5f;
    public float suavizacaoFov = 5f;
    public float tempoTransicaoAlvo = 0.6f;

    [Header("Recentralização (veículo)")]
    public float atrasoRecentrar = 1.2f;
    public float velocidadeRecentrar = 2.2f;
    public float velocidadeMinimaRecentrar = 2f;

    [Header("Colisão")]
    public LayerMask camadasColisao = ~0;
    public float raioColisao = 0.25f;
    public float margemColisao = 0.15f;
    public float distanciaMinimaColisao = 0.4f;
    public float velocidadeAproximarColisao = 25f;
    public float velocidadeAfastarColisao = 3.5f;

    // Estado
    private Camera cam;
    private float yaw;
    private float pitch;
    private float zoomUsuario;
    private float distanciaAtual;
    private Vector3 pivotPos;
    private Vector3 pivotVel;
    private Vector3 ultimaPosAlvo;
    private float velocidadeAlvo;
    private float tempoSemMouse;
    private float timerTransicao;
    private Vector2 deltaSuavizado;

    // Valores efetivos (interpolados entre perfis)
    private float efDistMin, efDistMax, efAltura, efOmbro, efFovBase, efFovExtra, efVelFov, efPitchPadrao;
    private float fovAtual;

    private readonly RaycastHit[] buffer = new RaycastHit[16];

    public float Yaw => yaw;
    public Quaternion RotacaoPlana => Quaternion.Euler(0f, yaw, 0f);

    private PerfilCamera PerfilAtual => modoVeiculo ? perfilVeiculo : perfilAndando;

    // ---------------------------------------------------------------
    private void Awake()
    {
        cam = GetComponent<Camera>();
    }

    private void Start()
    {
        EncontrarAlvo();

        PerfilCamera p = PerfilAtual;
        zoomUsuario = p.distancia;
        distanciaAtual = p.distancia;
        CopiarPerfil(p);
        fovAtual = efFovBase;
        cam.fieldOfView = fovAtual;

        if (alvo != null)
        {
            yaw = alvo.eulerAngles.y;
            pitch = p.pitchPadrao;
            ultimaPosAlvo = alvo.position;
            pivotPos = alvo.position + Vector3.up * efAltura;
        }

        if (travarCursor) TravarCursor(true);
    }

    private void OnValidate()
    {
        pitchMin = Mathf.Clamp(pitchMin, -89f, 0f);
        pitchMax = Mathf.Clamp(pitchMax, 0f, 89f);
        raioColisao = Mathf.Max(0.05f, raioColisao);
    }

    private void OnApplicationFocus(bool focado)
    {
        if (focado && travarCursor) TravarCursor(true);
    }

    // ---------------------------------------------------------------
    // API PÚBLICA
    // ---------------------------------------------------------------
    /// <summary>Troca o alvo da câmera com transição suave (ex.: jogador -> carro).</summary>
    public void TrocarAlvo(Transform novoAlvo, bool veiculo)
    {
        if (novoAlvo == null) return;

        alvo = novoAlvo;
        modoVeiculo = veiculo;
        ultimaPosAlvo = novoAlvo.position;
        velocidadeAlvo = 0f;
        timerTransicao = tempoTransicaoAlvo;

        PerfilCamera p = PerfilAtual;
        zoomUsuario = p.distancia;
        tempoSemMouse = 0f;

        if (veiculo) yaw = novoAlvo.eulerAngles.y; // começa atrás do carro
    }

    public void DefinirAngulo(float novoYaw, float novoPitch)
    {
        yaw = novoYaw;
        pitch = Mathf.Clamp(novoPitch, pitchMin, pitchMax);
    }

    // ---------------------------------------------------------------
    // LOOP
    // ---------------------------------------------------------------
    private void Update()
    {
        if (!travarCursor) return;

        bool escape = false, clique = false;
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null) escape = Keyboard.current.escapeKey.wasPressedThisFrame;
        if (Mouse.current != null) clique = Mouse.current.leftButton.wasPressedThisFrame;
#else
        escape = Input.GetKeyDown(KeyCode.Escape);
        clique = Input.GetMouseButtonDown(0);
#endif
        if (escape) TravarCursor(false);
        else if (clique && Cursor.lockState != CursorLockMode.Locked) TravarCursor(true);
    }

    private void LateUpdate()
    {
        if (alvo == null)
        {
            EncontrarAlvo();
            if (alvo == null) return;
            ultimaPosAlvo = alvo.position;
            pivotPos = alvo.position + Vector3.up * efAltura;
        }

        float dt = Mathf.Max(Time.unscaledDeltaTime, 0.0001f);
        if (Time.timeScale == 0f) return; // pausado

        PerfilCamera perfil = PerfilAtual;

        LerEntradas(dt, perfil);
        AtualizarVelocidade(dt);
        InterpolarPerfil(perfil, dt);
        Recentralizar(perfil, dt);

        // Pivô (ponto que a câmera mira), suavizado
        float suavPivo = timerTransicao > 0f ? Mathf.Max(suavizacaoPivo, 0.25f) : suavizacaoPivo;
        timerTransicao = Mathf.Max(0f, timerTransicao - dt);

        Vector3 pivoDesejado = alvo.position + Vector3.up * efAltura;
        pivotPos = suavPivo <= 0.0001f
            ? pivoDesejado
            : Vector3.SmoothDamp(pivotPos, pivoDesejado, ref pivotVel, suavPivo, Mathf.Infinity, dt);

        // Rotação e posição
        Quaternion rot = Quaternion.Euler(pitch, yaw, 0f);
        Vector3 direita = rot * Vector3.right;
        Vector3 origem = pivotPos + direita * efOmbro;
        Vector3 dirTras = rot * Vector3.back;

        // Zoom suave
        float distanciaDesejada = Mathf.Clamp(zoomUsuario, efDistMin, efDistMax);
        float distAposZoom = distanciaDesejada;

        // Colisão
        float distLivre = CalcularDistanciaLivre(origem, dirTras, distAposZoom);

        if (distLivre < distanciaAtual)
            distanciaAtual = distLivre; // aproxima na hora (nunca atravessa parede)
        else
            distanciaAtual = Mathf.Lerp(distanciaAtual, distLivre, 1f - Mathf.Exp(-velocidadeAfastarColisao * dt));

        transform.SetPositionAndRotation(origem + dirTras * distanciaAtual, rot);

        AtualizarFov(dt);
    }

    // ---------------------------------------------------------------
    // PARTES
    // ---------------------------------------------------------------
    private void LerEntradas(float dt, PerfilCamera perfil)
    {
        Vector2 delta = Vector2.zero;
        float scroll = 0f;

        if (Cursor.lockState == CursorLockMode.Locked || !travarCursor)
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                delta = Mouse.current.delta.ReadValue();
                scroll = Mouse.current.scroll.ReadValue().y / 120f;
            }
#else
            delta = new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y")) * 10f;
            scroll = Input.mouseScrollDelta.y;
#endif
        }

        if (suavizacaoMouse > 0.01f)
        {
            deltaSuavizado = Vector2.Lerp(deltaSuavizado, delta, 1f - Mathf.Exp(-suavizacaoMouse * dt));
            delta = deltaSuavizado;
        }

        if (delta.sqrMagnitude > 0.0001f) tempoSemMouse = 0f;
        else tempoSemMouse += dt;

        yaw += delta.x * sensibilidadeX;
        pitch += (inverterY ? delta.y : -delta.y) * sensibilidadeY;
        pitch = Mathf.Clamp(pitch, pitchMin, pitchMax);
        yaw = Mathf.Repeat(yaw, 360f);

        if (Mathf.Abs(scroll) > 0.001f)
            zoomUsuario = Mathf.Clamp(zoomUsuario - scroll * velocidadeZoom, efDistMin, efDistMax);
    }

    private void AtualizarVelocidade(float dt)
    {
        Vector3 deslocamento = alvo.position - ultimaPosAlvo;
        ultimaPosAlvo = alvo.position;

        float v = deslocamento.magnitude / dt;
        if (v > 120f) v = 0f; // teleporte: ignora

        velocidadeAlvo = Mathf.Lerp(velocidadeAlvo, v, 1f - Mathf.Exp(-8f * dt));
        direcaoMovimento = deslocamento.sqrMagnitude > 1e-8f ? deslocamento.normalized : Vector3.zero;
    }

    private Vector3 direcaoMovimento;

    private void Recentralizar(PerfilCamera perfil, float dt)
    {
        if (!perfil.recentrarAtras) return;
        if (tempoSemMouse < atrasoRecentrar) return;
        if (velocidadeAlvo < velocidadeMinimaRecentrar) return;

        // Só recentra se estiver indo para frente (não de ré)
        if (Vector3.Dot(direcaoMovimento, alvo.forward) <= 0.2f) return;

        float t = 1f - Mathf.Exp(-velocidadeRecentrar * dt);
        yaw = Mathf.LerpAngle(yaw, alvo.eulerAngles.y, t);
        pitch = Mathf.Lerp(pitch, efPitchPadrao, t);
    }

    private float CalcularDistanciaLivre(Vector3 origem, Vector3 direcao, float distanciaMaxima)
    {
        int n = Physics.SphereCastNonAlloc(origem, raioColisao, direcao, buffer,
            distanciaMaxima + margemColisao, camadasColisao, QueryTriggerInteraction.Ignore);

        float menor = distanciaMaxima;
        for (int i = 0; i < n; i++)
        {
            RaycastHit h = buffer[i];
            if (h.collider == null) continue;

            // Ignora o próprio alvo (jogador/carro e filhos)
            Transform t = h.collider.transform;
            if (t == alvo || t.IsChildOf(alvo) || alvo.IsChildOf(t)) continue;

            float d = h.distance - margemColisao;
            if (d < menor) menor = d;
        }

        return Mathf.Max(menor, Mathf.Min(distanciaMinimaColisao, distanciaMaxima));
    }

    private void InterpolarPerfil(PerfilCamera p, float dt)
    {
        float t = 1f - Mathf.Exp(-suavizacaoPerfil * dt);

        efDistMin = Mathf.Lerp(efDistMin, p.distanciaMin, t);
        efDistMax = Mathf.Lerp(efDistMax, p.distanciaMax, t);
        efAltura = Mathf.Lerp(efAltura, p.alturaFoco, t);
        efOmbro = Mathf.Lerp(efOmbro, p.offsetOmbro, t);
        efFovBase = Mathf.Lerp(efFovBase, p.fovBase, t);
        efFovExtra = Mathf.Lerp(efFovExtra, p.fovExtraVelocidade, t);
        efVelFov = Mathf.Lerp(efVelFov, Mathf.Max(0.1f, p.velocidadeMaxFov), t);
        efPitchPadrao = Mathf.Lerp(efPitchPadrao, p.pitchPadrao, t);

        // Zoom do usuário se aproxima suavemente do valor, respeitando os limites atuais
        zoomUsuario = Mathf.Clamp(zoomUsuario, efDistMin, efDistMax);
    }

    private void AtualizarFov(float dt)
    {
        float fator = Mathf.Clamp01(velocidadeAlvo / efVelFov);
        float fovAlvo = efFovBase + efFovExtra * fator * fator; // curva suave
        fovAtual = Mathf.Lerp(fovAtual, fovAlvo, 1f - Mathf.Exp(-suavizacaoFov * dt));
        cam.fieldOfView = fovAtual;
    }

    private void CopiarPerfil(PerfilCamera p)
    {
        efDistMin = p.distanciaMin;
        efDistMax = p.distanciaMax;
        efAltura = p.alturaFoco;
        efOmbro = p.offsetOmbro;
        efFovBase = p.fovBase;
        efFovExtra = p.fovExtraVelocidade;
        efVelFov = Mathf.Max(0.1f, p.velocidadeMaxFov);
        efPitchPadrao = p.pitchPadrao;
    }

    private void EncontrarAlvo()
    {
        if (alvo != null || !procurarJogadorPorTag) return;

        try
        {
            GameObject go = GameObject.FindGameObjectWithTag(tagJogador);
            if (go != null) alvo = go.transform;
        }
        catch (UnityException)
        {
            // Tag não existe no projeto; arraste o alvo manualmente no Inspector.
        }
    }

    private static void TravarCursor(bool travar)
    {
        Cursor.lockState = travar ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !travar;
    }
}