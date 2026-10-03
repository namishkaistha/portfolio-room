"""Write one textured triangle mesh as a binary glTF (.glb) file."""
import json
import struct

GLB_MAGIC, GLB_VERSION = 0x46546C67, 2
JSON_CHUNK, BINARY_CHUNK = 0x4E4F534A, 0x004E4942
HEADER_BYTES, CHUNK_HEADER_BYTES = 12, 8
ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER = 34962, 34963
FLOAT, UNSIGNED_INT = 5126, 5125
LINEAR, LINEAR_MIPMAP_LINEAR = 9729, 9987
FABRIC_ROUGHNESS = 0.92


def write_glb(path, name, mesh, jpeg):
    """mesh holds float32 positions, normals and uvs plus uint32 triangle indices."""
    parts = [(mesh["positions"], ARRAY_BUFFER), (mesh["normals"], ARRAY_BUFFER),
             (mesh["uvs"], ARRAY_BUFFER), (mesh["indices"], ELEMENT_ARRAY_BUFFER), (jpeg, None)]
    binary, buffer_views = pack_buffer(parts)
    document = describe(name, mesh, buffer_views, len(binary))
    write_chunks(path, padded(json.dumps(document).encode(), b" "), binary)


def pack_buffer(parts):
    blobs, views, offset = [], [], 0
    for data, target in parts:
        blob = data if isinstance(data, bytes) else data.tobytes()
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(blob)}
        if target:
            view["target"] = target
        views.append(view)
        blob = padded(blob, b"\0")
        blobs.append(blob)
        offset += len(blob)
    return b"".join(blobs), views


def describe(name, mesh, buffer_views, buffer_length):
    positions = mesh["positions"]
    return {
        "asset": {"version": "2.0", "generator": "portfolio-room garment builder"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{"name": name, "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2}, "indices": 3, "material": 0}]}],
        "materials": [{"name": name, "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicFactor": 0, "roughnessFactor": FABRIC_ROUGHNESS}}],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{"magFilter": LINEAR, "minFilter": LINEAR_MIPMAP_LINEAR}],
        "images": [{"bufferView": 4, "mimeType": "image/jpeg"}],
        "accessors": [
            {"bufferView": 0, "componentType": FLOAT, "count": len(positions), "type": "VEC3",
             "min": positions.min(0).tolist(), "max": positions.max(0).tolist()},
            {"bufferView": 1, "componentType": FLOAT, "count": len(mesh["normals"]), "type": "VEC3"},
            {"bufferView": 2, "componentType": FLOAT, "count": len(mesh["uvs"]), "type": "VEC2"},
            {"bufferView": 3, "componentType": UNSIGNED_INT, "count": mesh["indices"].size, "type": "SCALAR"},
        ],
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": buffer_length}],
    }


def write_chunks(path, json_bytes, binary):
    total = HEADER_BYTES + CHUNK_HEADER_BYTES + len(json_bytes) + CHUNK_HEADER_BYTES + len(binary)
    with open(path, "wb") as file:
        file.write(struct.pack("<III", GLB_MAGIC, GLB_VERSION, total))
        file.write(struct.pack("<II", len(json_bytes), JSON_CHUNK) + json_bytes)
        file.write(struct.pack("<II", len(binary), BINARY_CHUNK) + binary)


def padded(blob, filler):
    return blob + filler * (-len(blob) % 4)
