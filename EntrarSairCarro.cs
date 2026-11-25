using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public class EntrarSairCarro : MonoBehaviour
{
    [Header("Referencias (arrastar no Inspector)")]
    public GameObject jogador;
    public Transform cameraTransform;
    [Tooltip("Opcional: arraste o componente de script da camera se ela tiver um alvo (ex: target)")]
    public MonoBehaviour scriptCamera;

    [Header("Configuracoes")]
    public float distanciaParaEntrar = 4f;
    public Vector3 offsetSaida = new Vector3(-2.5f, 0.5f, 0f);
    public Vector3 offsetCameraCarro = new Vector3(0f, 4f, -8f);
    public float suavidadeCamera = 6f;

    private CarroControle carroControle;
    private Rigidbody rbCarro;
    private bool dentroDoCarro = false;
    private bool controleCarroEstavaAtivoNoInicio = false;

    private void Awake()
    {
        carroControle = GetComponent<CarroControle>();
        rbCarro = GetComponent<Rigidbody>();

        if (carroControle != null)
        {
            controleCarroEstavaAtivoNoInicio = carroControle.enabled;
            carroControle.enabled = false;
        }
    }

    private void Update()
    {
        if (ApertouTeclaE())
        {
            if (!dentroDoCarro)
            {
                TentarEntrar();
            }
            else
            {
                SairDoCarro();
            }
        }
    }

    private void LateUpdate()
    {
        if (dentroDoCarro && cameraTransform != null)
        {
            Vector3 posicaoDesejada = transform.TransformPoint(offsetCameraCarro);
            cameraTransform.position = Vector3.Lerp(cameraTransform.position, posicaoDesejada, suavidadeCamera * Time.deltaTime);

            Quaternion rotacaoDesejada = Quaternion.LookRotation(transform.position + Vector3.up * 1.2f - cameraTransform.position);
            cameraTransform.rotation = Quaternion.Slerp(cameraTransform.rotation, rotacaoDesejada, suavidadeCamera * Time.deltaTime);
        }
    }

    private void TentarEntrar()
    {
        if (jogador == null) return;

        float distancia = Vector3.Distance(jogador.transform.position, transform.position);
        if (distancia <= distanciaParaEntrar)
        {
            dentroDoCarro = true;

            jogador.SetActive(false);
            jogador.transform.SetParent(transform);
            jogador.transform.localPosition = Vector3.zero;

            if (scriptCamera != null)
            {
                scriptCamera.enabled = false;
            }

            if (rbCarro != null)
            {
                rbCarro.isKinematic = false;
            }

            if (carroControle != null)
            {
                carroControle.enabled = true;
            }
        }
    }

    private void SairDoCarro()
    {
        dentroDoCarro = false;

        if (carroControle != null)
        {
            carroControle.enabled = false;
        }

        if (jogador != null)
        {
            jogador.transform.SetParent(null);
            Vector3 posicaoSaida = transform.TransformPoint(offsetSaida);
            jogador.transform.position = posicaoSaida;
            jogador.SetActive(true);
        }

        if (scriptCamera != null)
        {
            scriptCamera.enabled = true;
        }
    }

    private bool ApertouTeclaE()
    {
#if ENABLE_INPUT_SYSTEM
        if (Keyboard.current != null && Keyboard.current.eKey.wasPressedThisFrame)
        {
            return true;
        }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
        if (Input.GetKeyDown(KeyCode.E))
        {
            return true;
        }
#endif
        return false;
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, distanciaParaEntrar);
    }
}