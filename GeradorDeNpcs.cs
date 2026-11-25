using System.Collections;
using UnityEngine;

/// <summary>
/// Cria vários NPCs sozinhos nas calçadas da cidade quando você aperta Play.
/// USO: anexe em um objeto vazio. Precisa do NpcVidaPropria no projeto.
/// </summary>
[DisallowMultipleComponent]
public class GeradorDeNpcs : MonoBehaviour
{
    [Header("Quantidade")]
    public int quantidade = 20;
    public bool gerarAoIniciar = true;

    [Header("Aparência")]
    [Tooltip("Opcional: um modelo seu (prefab) para usar nos NPCs. Vazio = cápsula colorida.")]
    public GameObject modeloPersonalizado;

    [Header("Onde nascem")]
    [Tooltip("Marcado: descobre a área da cidade sozinho.")]
    public bool acharAreaDaCidade = true;
    public string nomeObjetoAsfalto = "Malha_Ruas_Asfalto";
    [Tooltip("Só usado se não achar a cidade automaticamente.")] public Vector3 centroManual = Vector3.zero;
    public float raioManual = 80f;
    public float distanciaMinimaEntreNpcs = 3f;
    public int tentativasPorNpc = 60;
    [Tooltip("Quantos segundos esperar a cidade ser gerada.")] public float esperaMaximaCidade = 15f;

    private GameObject container;

    private IEnumerator Start()
    {
        if (gerarAoIniciar) yield return StartCoroutine(GerarRotina());
    }

    [ContextMenu("Apagar NPCs")]
    public void ApagarNpcs()
    {
        if (container != null) Destroy(container);
    }

    private IEnumerator GerarRotina()
    {
        // 1) Espera a cidade ser criada
        GameObject asfalto = null;
        float t = 0f;
        while (acharAreaDaCidade && t < esperaMaximaCidade)
        {
            asfalto = GameObject.Find(nomeObjetoAsfalto);
            if (asfalto != null) break;
            t += Time.deltaTime;
            yield return null;
        }

        // 2) Espera a física "enxergar" os chãos novos
        yield return new WaitForFixedUpdate();
        yield return new WaitForFixedUpdate();
        Physics.SyncTransforms();

        // 3) Descobre a área
        Vector3 centro = centroManual;
        float metadeX = raioManual;
        float metadeZ = raioManual;

        if (acharAreaDaCidade)
        {
            Renderer r = asfalto != null ? asfalto.GetComponent<Renderer>() : null;
            if (r != null)
            {
                centro = r.bounds.center;
                metadeX = r.bounds.extents.x - 2f;
                metadeZ = r.bounds.extents.z - 2f;
            }
            else
            {
                Debug.LogWarning("[GeradorDeNpcs] Não achei a cidade (objeto '" + nomeObjetoAsfalto + "'). Usando a área manual.");
            }
        }

        // 4) Cria os NPCs
        container = new GameObject("NPCs_Gerados");
        System.Collections.Generic.List<Vector3> usados = new System.Collections.Generic.List<Vector3>();
        int criados = 0;

        for (int i = 0; i < quantidade; i++)
        {
            for (int tentativa = 0; tentativa < tentativasPorNpc; tentativa++)
            {
                Vector3 sorteio = centro + new Vector3(Random.Range(-metadeX, metadeX), 0f, Random.Range(-metadeZ, metadeZ));

                Vector3 ponto;
                if (!NpcVidaPropria.TentarAcharCalcada(sorteio, out ponto)) continue;

                bool perto = false;
                for (int k = 0; k < usados.Count; k++)
                {
                    if ((usados[k] - ponto).sqrMagnitude < distanciaMinimaEntreNpcs * distanciaMinimaEntreNpcs)
                    {
                        perto = true;
                        break;
                    }
                }
                if (perto) continue;

                GameObject go = new GameObject("NPC_" + (i + 1));
                go.transform.SetParent(container.transform, true);
                go.transform.position = ponto;
                go.transform.rotation = Quaternion.Euler(0f, Random.Range(0f, 360f), 0f);

                NpcVidaPropria npc = go.AddComponent<NpcVidaPropria>();
                npc.modeloPersonalizado = modeloPersonalizado;

                usados.Add(ponto);
                criados++;
                break;
            }
        }

        if (criados < quantidade)
        {
            Debug.LogWarning("[GeradorDeNpcs] Só consegui colocar " + criados + " de " + quantidade + " NPCs. " +
                             "Confira se o chão da cidade tem objetos chamados 'Calcada' (e 'Asfalto') e se a calçada está larga.");
        }
    }
}