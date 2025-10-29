# Guia de Desenvolvimento Mobile Flutter (Ponto Eletrônico)

Este documento serve como guia inicial para a construção do aplicativo mobile em Flutter, focado na integração com o backend Supabase/Edge Functions configurado.

## 1. Arquitetura e Estrutura do Projeto

Adotaremos a **Clean Architecture** para garantir modularidade, testabilidade e escalabilidade.

```
lib/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── theme/
│   └── utils/
├── data/
│   ├── datasources/ (API, Local Storage)
│   ├── models/ (Mapeamento JSON/Dart)
│   └── repositories/ (Implementações)
├── domain/
│   ├── entities/ (Modelos de Negócio Puros)
│   ├── repositories/ (Contratos/Interfaces)
│   └── usecases/ (Regras de Negócio)
└── presentation/
    ├── bloc/ (Gerenciamento de Estado - Bloc/Cubit)
    ├── pages/ (Telas principais)
    └── widgets/
```

## 2. Dependências Essenciais (`pubspec.yaml`)

Você precisará das seguintes dependências para implementar as funcionalidades solicitadas:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP e Serialização
  dio: ^5.0.0 # Cliente HTTP robusto
  json_annotation: ^4.8.1 # Para serialização JSON
  
  # Supabase e Autenticação
  supabase_flutter: ^2.5.0 # Cliente Supabase
  flutter_secure_storage: ^9.0.0 # Armazenamento seguro de tokens
  
  # Geolocalização e Câmera
  geolocator: ^12.0.0 # Geolocalização
  camera: ^0.11.0 # Captura de foto
  
  # Reconhecimento Facial (Liveness Detection)
  google_mlkit_face_detection: ^0.12.0 # Para detecção de faces e liveness
  
  # Modo Offline e Sincronização
  sqflite_sqlcipher: ^2.2.0 # SQLite criptografado para dados offline
  workmanager: ^0.5.2 # Sincronização em background (Android/iOS)
  
  # Estado e Utilidades
  flutter_bloc: ^8.1.3 # Gerenciamento de estado
  equatable: ^2.0.5 # Comparação de objetos
  intl: ^0.19.0 # Internacionalização e formatação de datas
  path_provider: ^2.1.1 # Acesso a diretórios do sistema
  
dev_dependencies:
  build_runner: ^2.4.6
  json_serializable: ^6.7.1
```

## 3. Modelos de Domínio (Entities)

Estes modelos representam as entidades puras do seu domínio e devem ser imutáveis (usando `equatable`).

### `lib/domain/entities/profile_entity.dart`

```dart
import 'package:equatable/equatable.dart';

class ProfileEntity extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String role; // 'colaborador', 'gestor', 'admin'
  final String? avatarUrl;

  const ProfileEntity({
    required this.id,
    required this.email,
    required this.firstName,
    required this.role,
    this.avatarUrl,
  });

  @override
  List<Object?> get props => [id, email, firstName, role, avatarUrl];
}
```

### `lib/domain/entities/point_entity.dart`

```dart
import 'package:equatable/equatable.dart';

enum PointType { entrada, saida, almoco, pausa }
enum PointStatus { registrado, pendente, foraGeofence, falha }

class PointEntity extends Equatable {
  final String id;
  final String userId;
  final PointType type;
  final DateTime timestampUtc;
  final double latitude;
  final double longitude;
  final double accuracyM;
  final String? photoUrl;
  final PointStatus status;

  const PointEntity({
    required this.id,
    required this.userId,
    required this.type,
    required this.timestampUtc,
    required this.latitude,
    required this.longitude,
    required this.accuracyM,
    this.photoUrl,
    required this.status,
  });

  @override
  List<Object?> get props => [id, userId, type, timestampUtc, latitude, longitude, accuracyM, photoUrl, status];
}
```

### `lib/domain/entities/geofence_settings_entity.dart`

```dart
import 'package:equatable/equatable.dart';

class GeofenceSettingsEntity extends Equatable {
  final double centerLat;
  final double centerLon;
  final int radiusMeters;
  final int toleranceMinutes;

  const GeofenceSettingsEntity({
    required this.centerLat,
    required this.centerLon,
    required this.radiusMeters,
    required this.toleranceMinutes,
  });

  @override
  List<Object?> get props => [centerLat, centerLon, radiusMeters, toleranceMinutes];
}
```

## 4. Configuração do Cliente REST (Dio)

Você deve configurar o `Dio` para incluir o token de autenticação (JWT) em todas as requisições para as Edge Functions e APIs do Supabase.

### `lib/data/datasources/point_remote_datasource.dart` (Exemplo)

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mime/mime.dart';

class PointRemoteDataSource {
  final Dio dio;
  final String supabaseUrl = 'https://gfoogchxvxjfqwulgrbb.supabase.co';
  
  PointRemoteDataSource(this.dio);

  Future<Map<String, dynamic>> registerPoint({
    required String type,
    required double lat,
    required double lon,
    required double accuracyM,
    required String photoPath,
    required String userId,
    required String fingerprint,
    required String token,
  }) async {
    final uri = Uri.parse('$supabaseUrl/functions/v1/register-point');
    
    // 1. Preparar Metadados
    final metadata = {
      "user_id": userId,
      "timestamp_local": DateTime.now().toIso8601String(),
      "timestamp_utc": DateTime.now().toUtc().toIso8601String(),
      "lat": lat,
      "lon": lon,
      "accuracy_m": accuracyM,
      "device_id": "TODO_DEVICE_ID",
      "network_type": "TODO_NETWORK_TYPE",
      "mode": "SELFIE",
      "fingerprint": fingerprint,
    };

    // 2. Criar Multipart Form Data
    final file = File(photoPath);
    final mimeType = lookupMimeType(photoPath) ?? 'image/jpeg';
    
    final formData = FormData.fromMap({
      'metadata': metadata,
      'photo': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
        contentType: MediaType.parse(mimeType),
      ),
    });

    // 3. Enviar Requisição
    final response = await dio.post(
      uri.toString(),
      data: formData,
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'multipart/form-data',
        },
      ),
    );

    if (response.statusCode == 201) {
      return response.data;
    } else {
      throw Exception(response.data['error'] ?? 'Failed to register point');
    }
  }
}
```

## 5. Integração com Edge Functions

### 5.1. Registro de Ponto

*   **Endpoint:** `https://gfoogchxvxjfqwulgrbb.supabase.co/functions/v1/register-point`
*   **Método:** `POST` (Multipart/Form-Data)
*   **Headers:** `Authorization: Bearer [JWT]`
*   **Payload:** `photo` (File) + `metadata` (JSON String)

### 5.2. Verificação Facial

*   **Endpoint:** `https://gfoogchxvxjfqwulgrbb.supabase.co/functions/v1/verify-face`
*   **Método:** `POST` (application/json)
*   **Headers:** `Authorization: Bearer [JWT]`
*   **Payload:**

```json
{
  "image_hash": "sha256_of_image_to_verify",
  "user_id": "UUID_do_usuario"
}
```

*   **Resposta Esperada:**

```json
{
  "success": true,
  "match": true,
  "confidence": 0.95,
  "threshold": 0.85
}
```

## 6. Design System (Cores)

Use as seguintes cores no seu `theme.dart`:

| Nome | Valor Hex | Uso |
| :--- | :--- | :--- |
| Primary Color | `#0B1A34` | Azul Escuro (Fundo da Sidebar, Texto Principal) |
| Accent Color | `#FFD400` | Amarelo (Botões de Ação, Destaques) |
| Background | `#FFFFFF` | Fundo da Tela |

Este guia fornece a estrutura e os detalhes de integração necessários para iniciar o desenvolvimento do seu aplicativo Flutter. Boa codificação!