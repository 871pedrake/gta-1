using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Movimento de barcos ancorados ou navegando por waypoints ao longo do rio,
/// usando System.Random próprio para não interferir na seed determinística da cidade.
/// </summary>
public class CidadeBarcoNavegacao : MonoBehaviour
{
    private readonly List<Vector3> waypoints = new List<Vector3>();
    private int indiceAtual;
    private float velocidade = 4.5f;
    private bool ancorado;
    private Vector3 posBase;
    private float fase;
    private ParticleSystem esteira;

    public void ConfigurarAncorado(Vector3 posicao, int seedRuntime)
    {
        ancorado = true;
        posBase = posicao;
        var rng = new System.Random(seedRuntime);
        fase = (float)(rng.NextDouble() * Mathf.PI * 2.0);
        transform.localRotation = Quaternion.Euler(0f, (float)(rng.NextDouble() * 30.0 - 15.0) + 90f, 0f);
    }

    public void ConfigurarRota(List<Vector3> rota, int indiceInicial, float vel, ParticleSystem psEsteira, int seedRuntime)
    {
        ancorado = false;
        waypoints.Clear();
        waypoints.AddRange(rota);
        indiceAtual = Mathf.Clamp(indiceInicial, 0, Mathf.Max(0, waypoints.Count - 1));
        var rng = new System.Random(seedRuntime);
        velocidade = vel * (float)(0.85 + rng.NextDouble() * 0.35);
        fase = (float)(rng.NextDouble() * Mathf.PI * 2.0);
        esteira = psEsteira;
        if (waypoints.Count > 0) posBase = waypoints[indiceAtual];
    }

    private void Update()
    {
        float t = Time.time + fase;
        float balancoY = Mathf.Sin(t * 1.9f) * 0.08f;
        float roll = Mathf.Sin(t * 2.3f) * 2.8f;
        float pitch = Mathf.Cos(t * 1.7f) * 1.6f;

        if (ancorado || waypoints.Count < 2)
        {
            transform.localPosition = new Vector3(posBase.x, posBase.y + balancoY, posBase.z);
            Vector3 e = transform.localEulerAngles;
            transform.localRotation = Quaternion.Euler(pitch, e.y, roll);
            if (esteira != null && esteira.isPlaying) esteira.Stop();
            return;
        }

        Vector3 destino = waypoints[indiceAtual];
        Vector3 atual = transform.localPosition;
        Vector3 planoAtual = new Vector3(atual.x, 0f, atual.z);
        Vector3 planoDest = new Vector3(destino.x, 0f, destino.z);
        Vector3 dir = planoDest - planoAtual;
        float dist = dir.magnitude;

        if (dist < 1.8f)
        {
            indiceAtual = (indiceAtual + 1) % waypoints.Count;
            destino = waypoints[indiceAtual];
            dir = new Vector3(destino.x - atual.x, 0f, destino.z - atual.z);
        }

        if (dir.sqrMagnitude > 0.001f)
        {
            Quaternion alvoRot = Quaternion.LookRotation(dir.normalized, Vector3.up);
            Quaternion suave = Quaternion.Slerp(Quaternion.Euler(0f, transform.localEulerAngles.y, 0f), alvoRot, Time.deltaTime * 2.2f);
            transform.localRotation = Quaternion.Euler(pitch, suave.eulerAngles.y, roll);
        }

        Vector3 avanco = transform.forward * (velocidade * Time.deltaTime);
        transform.localPosition = new Vector3(atual.x + avanco.x, destino.y + balancoY, atual.z + avanco.z);
    }
}