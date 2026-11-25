using System;
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// Volume trigger da água do rio com eventos públicos OnEnter/OnExit
/// para integração futura de natação, barcos e afogamento.
/// </summary>
public class CidadeTriggerAgua : MonoBehaviour
{
    public event Action<Collider> OnEnter;
    public event Action<Collider> OnExit;

    [Serializable] public class EventoColisor : UnityEvent<Collider> { }
    public EventoColisor onEnterUnity = new EventoColisor();
    public EventoColisor onExitUnity = new EventoColisor();

    private void OnTriggerEnter(Collider other)
    {
        OnEnter?.Invoke(other);
        onEnterUnity?.Invoke(other);
    }

    private void OnTriggerExit(Collider other)
    {
        OnExit?.Invoke(other);
        onExitUnity?.Invoke(other);
    }
}