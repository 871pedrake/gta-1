using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

[RequireComponent(typeof(CharacterController))]
public class MovimentoJogador : MonoBehaviour
{
    [Header("Movimento")]
    public float velocidade = 4.8f;
    public float velocidadeCorrer = 8.8f;
    public float velocidadeAgachado = 2.6f;
    public float velocidadeNadar = 4.2f;
    public float aceleracaoChao = 16f;
    public float aceleracaoAr = 6f;
    public float forcaPulo = 7.5f;
    public float gravidade = -20f;

    [Header("Status (HUD)")]
    public float vidaMax = 100f;
    public float vidaAtual = 100f;
    public float coleteMax = 100f;
    public float coleteAtual = 50f;
    public float staminaMax = 100f;
    public float staminaAtual = 100f;
    public float gastoStaminaPorSeg = 22f;
    public float recargaStaminaPorSeg = 18f;

    [Header("Referência e Ajustes")]
    public Transform cameraTransform;
    public bool inverterHorizontal = false;
    public bool inverterVertical = false;

    // Estado exposto para animações e HUD
    public bool EstaCorrendo { get; private set; }
    public bool EstaAgachado { get; private set; }
    public bool EstaNadando { get; private set; }
    public bool EstaNoChao => controle != null && controle.isGrounded;
    public float VelocidadeHorizontalAtual { get; private set; }
    public float VelocidadeVerticalAtual => velocidadeVertical;
    public float TimerSoco { get; private set; }
    public float TimerAceno { get; private set; }
    public bool EmVeiculo { get; private set; }

    private CharacterController controle;
    private float velocidadeVertical;
    private Vector3 velPlanaAtual;
    private float alturaOriginalCC;
    private Vector3 centroOriginalCC;
    private float coyoteTimer;
    private float jumpBufferTimer;
    private bool exausto;
    private int contTriggersAgua;
    private GeradorCidadeInicial geradorCidade;

    private void Start()
    {
        controle = GetComponent<CharacterController>();
        alturaOriginalCC = controle.height;
        centroOriginalCC = controle.center;

        if (string.IsNullOrEmpty(gameObject.tag) || gameObject.tag == "Untagged")
        {
            try { gameObject.tag = "Player"; } catch { }
        }

        if (cameraTransform == null && Camera.main != null)
            cameraTransform = Camera.main.transform;

#if UNITY_2023_1_OR_NEWER
        geradorCidade =FindAnyObjectByType<GeradorCidadeInicial>();
#else
        geradorCidade = FindObjectOfType<GeradorCidadeInicial>();
#endif
    }

    public void DefinirEmVeiculo(bool ativo)
    {
        EmVeiculo = ativo;
        velPlanaAtual = Vector3.zero;
        VelocidadeHorizontalAtual = 0f;
        velocidadeVertical = 0f;
        EstaCorrendo = false;
        EstaAgachado = false;
        EstaNadando = false;
        if (controle != null) controle.enabled = !ativo;
    }

    public void ReceberDano(float dano)
    {
        if (dano <= 0f) return;
        if (coleteAtual > 0f)
        {
            float abs = Mathf.Min(coleteAtual, dano);
            coleteAtual -= abs;
            dano -= abs;
        }
        vidaAtual = Mathf.Max(0f, vidaAtual - dano);
        if (vidaAtual <= 0f)
        {
            vidaAtual = vidaMax;
            if (controle != null && controle.enabled)
            {
                controle.enabled = false;
                transform.position = new Vector3(0f, 3f, 0f);
                controle.enabled = true;
            }
            CidadeHUD.Notificar("Você desmaiou e voltou para a Praça Central!");
        }
    }

    private void Update()
    {
        if (EmVeiculo || controle == null || !controle.enabled) return;

        if (cameraTransform == null && Camera.main != null)
            cameraTransform = Camera.main.transform;

        float dt = Time.deltaTime;
        LerInputs(out float horizontal, out float vertical, out bool shift, out bool puloDown, out bool agacharToggle, out bool socoDown, out bool acenoDown);

        if (inverterHorizontal) horizontal *= -1f;
        if (inverterVertical) vertical *= -1f;

        if (agacharToggle && !EstaNadando)
            EstaAgachado = !EstaAgachado;

        AjustarColliderAgachado(dt);

        // Detectar água (por trigger ou nível da água da cidade)
        bool naAgua = contTriggersAgua > 0;
        if (!naAgua && geradorCidade != null && geradorCidade.criarRio)
        {
            if (transform.position.y < geradorCidade.NivelAgua - 0.55f &&
                geradorCidade.RetanguloSobreRio(transform.position.x, transform.position.z, 0.5f, 0.5f))
                naAgua = true;
        }
        EstaNadando = naAgua;
        if (EstaNadando) EstaAgachado = false;

        // Direção relativa à câmera
        Vector3 direcao;
        if (cameraTransform != null)
        {
            Vector3 frente = cameraTransform.forward;
            Vector3 direita = cameraTransform.right;
            frente.y = 0f;
            direita.y = 0f;
            direcao = frente.normalized * vertical + direita.normalized * horizontal;
        }
        else
        {
            direcao = new Vector3(horizontal, 0f, vertical);
        }
        direcao = Vector3.ClampMagnitude(direcao, 1f);
        bool querMover = direcao.sqrMagnitude > 0.01f;

        // Corrida e Stamina
        if (exausto && staminaAtual > staminaMax * 0.28f) exausto = false;
        bool podeCorrer = !EstaAgachado && !EstaNadando && !exausto && querMover && shift && staminaAtual > 0.5f;
        EstaCorrendo = podeCorrer;

        if (EstaCorrendo)
        {
            staminaAtual = Mathf.Max(0f, staminaAtual - gastoStaminaPorSeg * dt);
            if (staminaAtual <= 0.1f) exausto = true;
        }
        else
        {
            float taxa = querMover ? recargaStaminaPorSeg * 0.65f : recargaStaminaPorSeg;
            staminaAtual = Mathf.Min(staminaMax, staminaAtual + taxa * dt);
        }

        // Ações (Soco e Aceno)
        if (TimerSoco > 0f) TimerSoco = Mathf.Max(0f, TimerSoco - dt);
        if (TimerAceno > 0f) TimerAceno = Mathf.Max(0f, TimerAceno - dt);

        if (socoDown && TimerSoco <= 0.05f && !EstaNadando)
        {
            TimerSoco = 0.42f;
            AssustarNpcsProximos();
        }
        if (acenoDown && TimerAceno <= 0.05f)
            TimerAceno = 1.4f;

        // Rotação suave na direção do movimento
        if (querMover)
        {
            Quaternion rotAlvo = Quaternion.LookRotation(direcao);
            transform.rotation = Quaternion.Slerp(transform.rotation, rotAlvo, (EstaCorrendo ? 15f : 11f) * dt);
        }

        float velAlvo = EstaNadando ? velocidadeNadar :
                        (EstaAgachado ? velocidadeAgachado :
                        (EstaCorrendo ? velocidadeCorrer : velocidade));
        Vector3 velDesejada = direcao * velAlvo;
        float acel = (controle.isGrounded || EstaNadando) ? aceleracaoChao : aceleracaoAr;
        velPlanaAtual = Vector3.MoveTowards(velPlanaAtual, velDesejada, acel * dt);
        VelocidadeHorizontalAtual = new Vector2(velPlanaAtual.x, velPlanaAtual.z).magnitude;

        if (EstaNadando)
        {
            float alvoAguaY = geradorCidade != null ? geradorCidade.NivelAgua - 0.65f : transform.position.y;
            float empuxo = (alvoAguaY - transform.position.y) * 6f;
            velocidadeVertical = Mathf.Lerp(velocidadeVertical, empuxo, 8f * dt);
            if (puloDown) velocidadeVertical = forcaPulo * 0.65f;
        }
        else
        {
            if (controle.isGrounded)
            {
                coyoteTimer = 0.12f;
                if (velocidadeVertical < 0f) velocidadeVertical = -2.2f;
            }
            else
            {
                coyoteTimer -= dt;
            }

            if (puloDown) jumpBufferTimer = 0.12f;
            else jumpBufferTimer -= dt;

            if (jumpBufferTimer > 0f && coyoteTimer > 0f)
            {
                if (EstaAgachado) EstaAgachado = false;
                velocidadeVertical = forcaPulo;
                coyoteTimer = 0f;
                jumpBufferTimer = 0f;
            }

            velocidadeVertical += gravidade * dt;
        }

        Vector3 movFinal = velPlanaAtual;
        movFinal.y = velocidadeVertical;
        controle.Move(movFinal * dt);
    }

    private void AjustarColliderAgachado(float dt)
    {
        float hAlvo = EstaAgachado ? alturaOriginalCC * 0.62f : alturaOriginalCC;
        controle.height = Mathf.Lerp(controle.height, hAlvo, 12f * dt);
        Vector3 c = centroOriginalCC;
        c.y -= (alturaOriginalCC - controle.height) * 0.5f;
        controle.center = c;
    }

    private void AssustarNpcsProximos()
    {
#if UNITY_2023_1_OR_NEWER
        CidadePedestreAgente[] peds = FindObjectsByType<CidadePedestreAgente>(FindObjectsSortMode.None);
#else
        CidadePedestreAgente[] peds = FindObjectsOfType<CidadePedestreAgente>();
#endif
        for (int i = 0; i < peds.Length; i++)
        {
            if (peds[i] != null && (peds[i].transform.position - transform.position).sqrMagnitude < 49f)
                peds[i].Assustar(transform.position);
        }
    }

    private void LerInputs(out float h, out float v, out bool shift, out bool puloDown, out bool agacharDown, out bool socoDown, out bool acenoDown)
    {
        h = 0f; v = 0f; shift = false; puloDown = false; agacharDown = false; socoDown = false; acenoDown = false;

#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null)
        {
            var kb = Keyboard.current;
            if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) h += 1f;
            if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) h -= 1f;
            if (kb.wKey.isPressed || kb.upArrowKey.isPressed) v += 1f;
            if (kb.sKey.isPressed || kb.downArrowKey.isPressed) v -= 1f;
            shift = kb.leftShiftKey.isPressed || kb.rightShiftKey.isPressed;
            puloDown = kb.spaceKey.wasPressedThisFrame;
            agacharDown = kb.cKey.wasPressedThisFrame || kb.leftCtrlKey.wasPressedThisFrame;
            socoDown = kb.qKey.wasPressedThisFrame;
            acenoDown = kb.vKey.wasPressedThisFrame;
        }
        if (Mouse.current != null && Cursor.lockState == CursorLockMode.Locked)
            socoDown |= Mouse.current.leftButton.wasPressedThisFrame;
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
        if (Mathf.Abs(h) < 0.01f && Mathf.Abs(v) < 0.01f)
        {
            h = Input.GetAxisRaw("Horizontal");
            v = Input.GetAxisRaw("Vertical");
        }
        shift |= Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        puloDown |= Input.GetKeyDown(KeyCode.Space);
        agacharDown |= Input.GetKeyDown(KeyCode.C) || Input.GetKeyDown(KeyCode.LeftControl);
        socoDown |= Input.GetKeyDown(KeyCode.Q) || (Cursor.lockState == CursorLockMode.Locked && Input.GetMouseButtonDown(0));
        acenoDown |= Input.GetKeyDown(KeyCode.V);
#endif
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other != null && (other.CompareTag("Agua") || other.gameObject.name.Contains("Agua")))
            contTriggersAgua++;
    }

    private void OnTriggerExit(Collider other)
    {
        if (other != null && (other.CompareTag("Agua") || other.gameObject.name.Contains("Agua")))
            contTriggersAgua = Mathf.Max(0, contTriggersAgua - 1);
    }
}