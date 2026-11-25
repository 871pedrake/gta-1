using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

[DisallowMultipleComponent]
public class CidadeOtimizadorRuntime : MonoBehaviour
{
    [Header("Culling por Distância")]
    public float distanciaDetalhes = 155f;
    public float distanciaPropsPequenos = 110f;
    public float distanciaLuzes = 95f;
    [Range(30, 200)]
    public int itensPorLote = 100;

    private readonly List<Renderer> propsMedios = new List<Renderer>();
    private readonly List<Vector3> centrosMedios = new List<Vector3>();

    private readonly List<Renderer> propsPequenos = new List<Renderer>();
    private readonly List<Vector3> centrosPequenos = new List<Vector3>();

    private readonly List<Light> luzesLocais = new List<Light>();
    private readonly List<Vector3> posLuzes = new List<Vector3>();

    private Camera camPrincipal;
    private float proximoTick;
    private int cursorMedios;
    private int cursorPequenos;
    private int cursorLuzes;

    private void Start()
    {
        Recoletar();
    }

    public void Recoletar()
    {
        propsMedios.Clear();
        centrosMedios.Clear();
        propsPequenos.Clear();
        centrosPequenos.Clear();
        luzesLocais.Clear();
        posLuzes.Clear();

        Renderer[] todos = GetComponentsInChildren<Renderer>(true);
        for (int i = 0; i < todos.Length; i++)
        {
            Renderer r = todos[i];
            if (r == null) continue;
            if (EhObjetoIgnorado(r.transform)) continue;

            Bounds b = r.bounds;
            float tam = b.size.magnitude;

            if (tam < 4.5f)
            {
                propsPequenos.Add(r);
                centrosPequenos.Add(b.center);
            }
            else if (tam < 16f)
            {
                propsMedios.Add(r);
                centrosMedios.Add(b.center);
            }
        }

        Light[] luzes = GetComponentsInChildren<Light>(true);
        for (int i = 0; i < luzes.Length; i++)
        {
            Light l = luzes[i];
            if (l == null || l.type == LightType.Directional) continue;
            luzesLocais.Add(l);
            posLuzes.Add(l.transform.position);
        }
    }

    private void Update()
    {
        if (Time.unscaledTime < proximoTick) return;
        proximoTick = Time.unscaledTime + 0.08f;

        if (camPrincipal == null || !camPrincipal.isActiveAndEnabled)
            camPrincipal = Camera.main;
        if (camPrincipal == null) return;

        Vector3 camPos = camPrincipal.transform.position;

        AtualizarLoteRenderers(propsPequenos, centrosPequenos, ref cursorPequenos, camPos, distanciaPropsPequenos * distanciaPropsPequenos);
        AtualizarLoteRenderers(propsMedios, centrosMedios, ref cursorMedios, camPos, distanciaDetalhes * distanciaDetalhes);

        if (luzesLocais.Count > 0)
        {
            float sqrLuz = distanciaLuzes * distanciaLuzes;
            int qtd = Mathf.Min(itensPorLote, luzesLocais.Count);
            for (int i = 0; i < qtd; i++)
            {
                if (cursorLuzes >= luzesLocais.Count) cursorLuzes = 0;
                Light l = luzesLocais[cursorLuzes];
                if (l != null)
                {
                    bool ativo = (posLuzes[cursorLuzes] - camPos).sqrMagnitude <= sqrLuz;
                    if (l.enabled != ativo)
                        l.enabled = ativo;
                }
                cursorLuzes++;
            }
        }
    }

    private void AtualizarLoteRenderers(List<Renderer> lista, List<Vector3> centros, ref int cursor, Vector3 camPos, float sqrMax)
    {
        if (lista.Count == 0) return;

        int qtd = Mathf.Min(itensPorLote, lista.Count);
        for (int i = 0; i < qtd; i++)
        {
            if (cursor >= lista.Count) cursor = 0;
            Renderer r = lista[cursor];
            if (r != null)
            {
                bool visivel = (centros[cursor] - camPos).sqrMagnitude <= sqrMax;
                if (r.enabled != visivel)
                    r.enabled = visivel;
            }
            cursor++;
        }
    }

    private static bool EhObjetoIgnorado(Transform t)
    {
        while (t != null)
        {
            string n = t.name.ToLowerInvariant();
            if (n.Contains("batch_") || n.Contains("asfalto") || n.Contains("terreno") ||
                n.Contains("rio") || n.Contains("morro") || n.Contains("ponte") ||
                n.Contains("veiculo") || n.Contains("carro") || n.Contains("moto") ||
                n.Contains("bicicleta") || n.Contains("caminhao") || n.Contains("onibus") ||
                n.Contains("barco") || n.Contains("pedestre") || n.Contains("fauna") ||
                n.Contains("trafego") || n.Contains("transito") || n.Contains("npc") ||
                n.Contains("anim_") || n.Contains("semaforo") || n.Contains("jogador") ||
                n.Contains("player") || n.Contains("chassi"))
            {
                return true;
            }
            t = t.parent;
        }
        return false;
    }
}