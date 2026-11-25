#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(GeradorCidadeInicial))]
public class GeradorCidadeInicialEditor : Editor
{
    public override void OnInspectorGUI()
    {
        GeradorCidadeInicial gerador = (GeradorCidadeInicial)target;

        EditorGUILayout.Space(6);
        EditorGUILayout.HelpBox(
            "1) Clique em GERAR MAPA 3D OTIMIZADO sem dar Play.\n" +
            "2) As malhas são combinadas por material e marcadas como Static.\n" +
            "3) Clique em SALVAR PREFAB ou arraste 'Cidade_Inicial_Gerada' para a pasta Assets.",
            MessageType.Info);

        GUI.backgroundColor = new Color(0.35f, 0.85f, 0.45f);
        if (GUILayout.Button("1. Gerar Mapa 3D Otimizado (Sem Play)", GUILayout.Height(36)))
        {
            gerador.GerarCidade();
        }

        GUI.backgroundColor = new Color(0.35f, 0.70f, 0.98f);
        if (GUILayout.Button("2. Salvar Mapa como Prefab Definitivo", GUILayout.Height(32)))
        {
            gerador.SalvarComoPrefabEditor();
        }

        GUI.backgroundColor = new Color(0.95f, 0.45f, 0.40f);
        if (GUILayout.Button("Limpar Mapa", GUILayout.Height(26)))
        {
            gerador.LimparCidade();
        }

        GUI.backgroundColor = Color.white;
        EditorGUILayout.Space(8);

        Transform raiz = gerador.transform.Find(GeradorCidadeInicial.NOME_RAIZ);
        if (raiz != null)
        {
            int totalRenderers = raiz.GetComponentsInChildren<MeshRenderer>(true).Length;
            int totalColliders = raiz.GetComponentsInChildren<MeshCollider>(true).Length;
            EditorGUILayout.HelpBox(
                $"Mapa pronto na cena! Objetos combinados: {totalRenderers} MeshRenderers | {totalColliders} MeshColliders.",
                MessageType.None);
        }

        DrawDefaultInspector();
    }
}
#endif