using System.Collections.Generic;
using UnityEngine;

public class CidadePedestreAgente : MonoBehaviour
{
    private GeradorCidadeInicial gerador;
    private System.Random rng;
    private float velocidade;
    private float[] ruasX;
    private float[] ruasZ;
    private float calcadaOff;
    private float limX;
    private float limZ;
    private List<CidadeSemaforoControlador> semaforos;

    private Transform pernaE, pernaD, bracoE, bracoD, cabeca;
    private bool parado;
    private bool andandoEmX;
    private int sentido = 1;
    private float fase;
    private float timerSusto;
    private Vector3 dirFuga;

    public void Configurar(
        GeradorCidadeInicial gen, int seed, float vel, float[] rx, float[] rz, float offCalcada,
        float limiteX, float limiteZ, List<CidadeSemaforoControlador> sems,
        Transform pE, Transform pD, Transform bE, Transform bD, bool ehParado)
    {
        gerador = gen;
        rng = new System.Random(seed);
        velocidade = vel;
        ruasX = rx;
        ruasZ = rz;
        calcadaOff = offCalcada;
        limX = limiteX;
        limZ = limiteZ;
        semaforos = sems;
        pernaE = pE; pernaD = pD; bracoE = bE; bracoD = bD;
        cabeca = transform.Find("Cabeca");
        parado = ehParado;
        fase = (float)(rng.NextDouble() * 6.28);

        Vector3 f = transform.forward;
        andandoEmX = Mathf.Abs(f.x) >= Mathf.Abs(f.z);
        sentido = andandoEmX ? (f.x >= 0f ? 1 : -1) : (f.z >= 0f ? 1 : -1);
    }

    public void Assustar(Vector3 origemPerigo)
    {
        Vector3 d = transform.position - origemPerigo;
        d.y = 0f;
        dirFuga = d.sqrMagnitude > 0.01f ? d.normalized : -transform.forward;
        timerSusto = 4.0f;
    }

    private void Update()
    {
        float dt = Time.deltaTime;

        if (timerSusto > 0f)
        {
            timerSusto -= dt;
            Vector3 p = transform.position + dirFuga * (4.4f * dt);
            p.x = Mathf.Clamp(p.x, -limX + 0.5f, limX - 0.5f);
            p.z = Mathf.Clamp(p.z, -limZ + 0.5f, limZ - 0.5f);
            AjustarAltura(ref p, dt);
            transform.position = p;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dirFuga, Vector3.up), 12f * dt);

            fase += dt * 16f;
            float ang = Mathf.Sin(fase) * 48f;
            if (pernaE != null) pernaE.localRotation = Quaternion.Euler(ang, 0f, 0f);
            if (pernaD != null) pernaD.localRotation = Quaternion.Euler(-ang, 0f, 0f);
            if (bracoE != null) bracoE.localRotation = Quaternion.Euler(-110f, 0f, -25f);
            if (bracoD != null) bracoD.localRotation = Quaternion.Euler(-110f, 0f, 25f);
            return;
        }

        if (parado)
        {
            fase += dt * 2.2f;
            if (bracoD != null) bracoD.localRotation = Quaternion.Slerp(bracoD.localRotation, Quaternion.Euler(-42f + Mathf.Sin(fase) * 14f, 0f, 8f), 8f * dt);
            if (bracoE != null) bracoE.localRotation = Quaternion.Slerp(bracoE.localRotation, Quaternion.Euler(Mathf.Sin(fase * 0.7f) * 8f, 0f, -6f), 8f * dt);
            if (cabeca != null) cabeca.localRotation = Quaternion.Euler(14f, Mathf.Sin(fase * 0.5f) * 25f, 0f);
            return;
        }

        Vector3 dir = andandoEmX ? new Vector3(sentido, 0f, 0f) : new Vector3(0f, 0f, sentido);
        Vector3 pos = transform.position;
        bool esperandoSinal = false;

        if (semaforos != null)
        {
            for (int i = 0; i < semaforos.Count; i++)
            {
                CidadeSemaforoControlador sem = semaforos[i];
                if (sem == null) continue;
                Vector3 dif = sem.transform.position - pos;
                float d = dif.magnitude;
                if (d > 2.5f && d < 7.5f && Vector3.Dot(dif / d, dir) > 0.7f && !sem.PodePassar(dir))
                {
                    esperandoSinal = true;
                    break;
                }
            }
        }

        if (!esperandoSinal)
        {
            pos += dir * (velocidade * dt);

            if (Mathf.Abs(pos.x) > limX || Mathf.Abs(pos.z) > limZ)
            {
                if (rng.NextDouble() < 0.5)
                {
                    sentido = -sentido;
                    pos.x = Mathf.Clamp(pos.x, -limX + 0.5f, limX - 0.5f);
                    pos.z = Mathf.Clamp(pos.z, -limZ + 0.5f, limZ - 0.5f);
                }
                else
                {
                    andandoEmX = !andandoEmX;
                    sentido = rng.Next(0, 2) == 0 ? 1 : -1;
                }
            }

            AjustarAltura(ref pos, dt);
            transform.position = pos;
            Vector3 dirAlvo = andandoEmX ? new Vector3(sentido, 0f, 0f) : new Vector3(0f, 0f, sentido);
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dirAlvo, Vector3.up), dt * 8f);

            fase += dt * velocidade * 5.2f;
            float ang = Mathf.Sin(fase) * 34f;
            if (pernaE != null) pernaE.localRotation = Quaternion.Euler(ang, 0f, 0f);
            if (pernaD != null) pernaD.localRotation = Quaternion.Euler(-ang, 0f, 0f);
            if (bracoE != null) bracoE.localRotation = Quaternion.Euler(-ang * 0.75f, 0f, -5f);
            if (bracoD != null) bracoD.localRotation = Quaternion.Euler(ang * 0.75f, 0f, 5f);
            if (cabeca != null) cabeca.localRotation = Quaternion.Euler(0f, Mathf.Sin(fase * 0.25f) * 10f, 0f);
        }
        else
        {
            // Olha para os lados esperando o sinal abrir
            if (pernaE != null) pernaE.localRotation = Quaternion.Slerp(pernaE.localRotation, Quaternion.identity, 8f * dt);
            if (pernaD != null) pernaD.localRotation = Quaternion.Slerp(pernaD.localRotation, Quaternion.identity, 8f * dt);
            if (cabeca != null) cabeca.localRotation = Quaternion.Euler(0f, Mathf.Sin(Time.time * 2.1f + fase) * 38f, 0f);
        }
    }

    private void AjustarAltura(ref Vector3 pos, float dt)
    {
        if (gerador != null)
        {
            float yTerreno = gerador.AlturaTerreno(pos.x, pos.z);
            float yChao = Mathf.Max(gerador.TopoCalcada(false), yTerreno);
            pos.y = Mathf.Lerp(pos.y, yChao, dt * 10f);
        }
    }
}