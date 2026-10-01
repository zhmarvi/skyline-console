.. _configuration-rating-service:

=======================================
Enabling the Rating (CloudKitty) panels
=======================================

The **Rating** panels (Summary, Rating Modules, HashMap and PyScripts) are
driven by the OpenStack Rating service, CloudKitty. They are hidden until
skyline-apiserver publishes a ``cloudkitty`` endpoint to the console.

Why an extra setting is needed
------------------------------

skyline-apiserver builds the endpoint list it hands to the console by walking
the keystone service catalog and translating each catalog **service type**
through its ``openstack.service_mapping`` setting. Catalog entries whose
service type is absent from that mapping are skipped silently.

CloudKitty registers itself in the catalog under the service type ``rating``,
and ``service_mapping`` has no ``rating`` entry by default. Without it the
console never receives a ``cloudkitty`` endpoint.

Configuration
-------------

Add a ``rating`` entry to ``service_mapping`` in the skyline-apiserver
configuration, normally ``/etc/skyline/skyline.yaml``:

.. code-block:: yaml

 openstack:
   service_mapping:
     rating: cloudkitty

Because ``service_mapping`` is the same setting skyline-apiserver uses to
generate its nginx proxy routes, this single entry also creates the route the
console's API calls travel through. Restart skyline-apiserver, then sign in
again so the browser picks up a refreshed profile, as the endpoint list is
resolved at login.

Verifying
---------

The ``Rating`` item should appear in the navigation menu. If it is still
missing, confirm that:

-  CloudKitty is deployed and has a catalog entry of type ``rating`` in the
   region being used, for example ``openstack catalog show rating``.
-  The authenticated user holds a role permitted by CloudKitty's
   ``rating:*`` and ``summary:*`` policies.

Symptoms when the mapping is absent
-----------------------------------

The feature fails closed rather than erroring: the console's CloudKitty client
reports itself as disabled and the menu entry is filtered out, so the panels
simply do not appear.
