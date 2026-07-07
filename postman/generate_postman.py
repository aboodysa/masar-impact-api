import json, re, uuid

with open('/masar/impact-api/postman/masar_openapi.json') as f:
    spec = json.load(f)

API_TOKEN = open('/masar/impact-api/.api_token').read().strip()
BASE_URL = 'https://myapi.businessanalystcrew.org'

collection = {
    "info": {
        "name": "MASAR Impact Analysis API",
        "description": "MASAR Impact Analysis API — تحليل تأثير خدمات مسار\n\n" +
                       "All authenticated endpoints require `Authorization: Bearer <token>` header.\n" +
                       "The `/health` endpoint is public (no auth required).\n\n" +
                       "Base URL: https://myapi.businessanalystcrew.org",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        "_exporter_id": "masar-impact-api"
    },
    "auth": {
        "type": "bearer",
        "bearer": [{"key": "token", "value": API_TOKEN, "type": "string"}]
    },
    "item": []
}

def build_header(key, value, description=""):
    return {"key": key, "value": value, "type": "text", "description": description}

def type_to_example(schema):
    """Generate example value from schema"""
    if not schema: return "string"
    ref = schema.get('$ref', '')
    if ref:
        name = ref.split('/')[-1]
        examples = {
            'GraphStatsDto': {"total_nodes": 727, "total_edges": 722, "by_type": {"Service": 25, "Screen": 69}},
            'GraphNodesResponse': {"page": 1, "limit": 50, "total": 727, "totalPages": 15, "type": None, "nodes": [{"id": "svc:wafed", "type": "Service", "label": "وافد"}]},
            'NodeTypeCount': {"type": "Service", "count": 25},
            'ImpactAnalyzeRequest': {"changeRequest": {"title": "تعديل شاشة إنهاء التعاقد", "description": "إضافة إدخال يدوي لفئة الوظيفة", "targetService": "svc:wafed"}},
            'ImpactAnalyzeResponse': {"requestId": "REQ-ABC123", "status": "completed", "timestamp": "2026-07-07T00:00:00Z", "summary": {"totalServices": 3, "highImpact": 1, "mediumImpact": 2, "risks": 0}, "impacts": [], "risks": [], "recommendedActions": [], "findings": []},
            'CreateJobRequest': {"title": "تحليل تأثير تعديل وافد", "description": "تغيير شاشة إنهاء التعاقد", "targetService": "svc:wafed"},
            'SearchResponse': {"query": "ترقيات", "count": 5, "results": [{"id": "svc:promotions", "type": "Service", "label": "الترقيات"}]},
            'JobListResponse': {"page": 1, "limit": 50, "total": 2, "totalPages": 1, "jobs": []},
            'JobDetailResponse': {"job": {"id": "job-abc123", "title": "تحليل تأثير", "status": "completed", "progress": 100, "createdAt": "2026-07-07T00:00:00Z"}},
            'JobResultResponse': {"result": {"status": "completed"}},
            'MaturityIndexResponse': {"overall_index": 3.04, "tier": "متوسط", "total_services": 25, "distribution": {"L4": 6, "L3": 14, "L2": 5}, "readiness": {"IR-4": 2, "IR-3": 22, "IR-2": 1}, "by_domain": {}, "entries": []},
            'ServiceListResponse': {"page": 1, "limit": 20, "total": 25, "totalPages": 2, "services": [{"id": "svc:wafed", "name_ar": "وافد", "name_en": "WAFED", "domain": "Employment", "maturity": "L4", "impact_readiness": "IR-4"}]},
            'ServiceDetailResponse': {"service": {"id": "svc:wafed", "name_ar": "وافد"}, "screens": [], "roles": [], "integrations": [], "dependencies": {"dependsOn": [], "dependedBy": []}, "documents": []},
            'DependenciesDto': {"dependsOn": [{"id": "svc:jics", "name": "النظام المركزي"}], "dependedBy": []},
            'ImpactPathResponse': {"service": {"id": "svc:wafed"}, "path": {"screens": [], "integrations": []}},
            'ExternalSystemListResponse': {"page": 1, "limit": 50, "total": 25, "totalPages": 1, "external_systems": [{"id": "ext:nic", "name_ar": "مركز المعلومات الوطني", "connected_services": ["svc:wafed"], "integration_count": 15}]},
            'ExternalSystemDetailResponse': {"external_system": {"id": "ext:nic", "name_ar": "مركز المعلومات الوطني"}, "integrations": []},
        }
        return json.dumps(examples.get(name, {"message": name}), ensure_ascii=False, indent=2)
    
    st = schema.get('type', 'string')
    if st == 'object':
        props = schema.get('properties', {})
        obj = {}
        for k, v in props.items():
            if v.get('example'):
                obj[k] = v['example']
            elif v.get('type') == 'number':
                obj[k] = 0
            elif v.get('type') == 'array':
                obj[k] = []
            else:
                obj[k] = "string"
        return json.dumps(obj, ensure_ascii=False, indent=2)
    return json.dumps(schema.get('example', 'string'), ensure_ascii=False)

# Build items from spec paths
for path, methods in spec['paths'].items():
    for method, details in methods.items():
        tags = details.get('tags', ['General'])
        tag_name = tags[0] if tags else 'General'
        
        operation_id = details.get('operationId', '')
        summary = details.get('summary', operation_id)
        description = details.get('description', '')
        
        # Create request URL
        url_parts = path.split('/')
        query_params = []
        
        # Build URL with path variables
        url_display = f"{BASE_URL}{path}"
        url_variables = {}
        
        # Process parameters
        headers = []
        for param in details.get('parameters', []):
            pname = param['name']
            ptype = param.get('in', 'query')
            pexample = param.get('schema', {}).get('example', '')
            
            if ptype == 'path':
                url_display = url_display.replace(f'{{{pname}}}', f':{pname}')
            elif ptype == 'query':
                if pexample:
                    query_params.append({"key": pname, "value": str(pexample), "description": param.get('description', ''), "type": "text"})
        
        # Process request body
        body = None
        request_body = details.get('requestBody', {})
        if request_body:
            content = request_body.get('content', {}).get('application/json', {})
            schema = content.get('schema', {})
            example = type_to_example(schema)
            body = {
                "mode": "raw",
                "raw": example,
                "options": {"raw": {"language": "json"}}
            }
        
        # Auth header only for non-health routes
        if path != '/health':
            headers.append(build_header("Authorization", "Bearer {{token}}", "API authentication token"))
        
        item = {
            "name": f"{summary} [{method.upper()}]",
            "description": description or summary,
            "request": {
                "method": method.upper(),
                "header": headers,
                "url": {
                    "raw": url_display,
                    "protocol": "https",
                    "host": ["myapi", "businessanalystcrew", "org"],
                    "path": [p for p in path.split('/') if p],
                    "query": query_params if query_params else [],
                    "variable": []
                }
            },
            "response": [],
            "tags": [tag_name]
        }
        
        if body:
            item["request"]["body"] = body
        
        # Add to category
        category = next((it for it in collection['item'] if it['name'] == tag_name), None)
        if not category:
            category = {"name": tag_name, "item": []}
            collection['item'].append(category)
        category['item'].append(item)

# Save
output_path = '/masar/impact-api/postman/MASAR_Impact_Analysis_API.postman_collection.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)

print(f"Postman collection saved: {output_path}")
print(f"Endpoints: {sum(len(cat['item']) for cat in collection['item'])}")
print(f"Categories: {[c['name'] for c in collection['item']]}")
print(f"\nAuth: Bearer token auto-configured")
print(f"Token preview: {API_TOKEN[:12]}...")
