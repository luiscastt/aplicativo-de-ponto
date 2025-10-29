# Guia Completo de Desenvolvimento Flutter: Painel de Ponto Mobile

Este guia detalha a implementação do aplicativo mobile de registro de ponto eletrônico em Flutter, seguindo a Clean Architecture e integrando-se ao backend Supabase configurado.

## 1. Configuração Inicial do Projeto

### 1.1. Criação do Projeto

```bash
flutter create ponto_mobile
cd ponto_mobile
```

### 1.2. Configuração do `pubspec.yaml`

Adicione as dependências essenciais. Lembre-se de rodar `flutter pub get` após a edição.

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Arquitetura e Estado
  equatable: ^2.0.5 # Comparação de objetos (Entities)
  flutter_bloc: ^8.1.3 # Gerenciamento de estado (BLoC/Cubit)
  get_it: ^7.7.0 # Injeção de Dependência
  
  # Comunicação e Dados
  dio: ^5.0.0 # Cliente HTTP robusto
  json_annotation: ^4.8.1 # Para serialização JSON
  
  # Supabase e Segurança
  supabase_flutter: ^2.5.0 # Cliente Supabase
  flutter_secure_storage: ^9.0.0 # Armazenamento seguro de tokens (JWT, PIN)
  
  # Geolocalização e Câmera
  geolocator: ^12.0.0 # Geolocalização
  camera: ^0.11.0 # Captura de foto
  
  # Reconhecimento Facial (Liveness Detection)
  google_mlkit_face_detection: ^0.12.0 # Detecção de faces e liveness
  
  # Modo Offline e Sincronização
  sqflite_sqlcipher: ^2.2.0 # SQLite criptografado para dados offline
  workmanager: ^0.5.2 # Sincronização em background (Android/iOS)
  
  # Utilidades
  intl: ^0.19.0 # Internacionalização e formatação de datas
  path_provider: ^2.1.1 # Acesso a diretórios do sistema
  crypto: ^3.0.3 # Para gerar hash SHA256 da imagem
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.6
  json_serializable: ^6.7.1
```

## 2. Camada Core (`lib/core`)

### 2.1. Tema (`lib/core/theme/app_theme.dart`)

Definindo o tema visual com as cores corporativas.

```dart
import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF0B1A34); // Azul Escuro
  static const Color accent = Color(0xFFFFD400); // Amarelo
  static const Color background = Color(0xFFFFFFFF); // Branco
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFFC107);
  static const Color error = Color(0xFFF44336);
}

final ThemeData appTheme = ThemeData(
  primaryColor: AppColors.primary,
  scaffoldBackgroundColor: AppColors.background,
  fontFamily: 'Inter', // Assumindo que você adicionará a fonte Inter
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.primary,
    foregroundColor: AppColors.background,
    elevation: 0,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.accent,
      foregroundColor: AppColors.primary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16.0), // Cantos arredondados
      ),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
      elevation: 4, // Sombra suave
    ),
  ),
  // Configurações adicionais de input, card, etc.
);
```

### 2.2. Injeção de Dependência (`lib/core/di/injection_container.dart`)

Usaremos `get_it` para gerenciar as instâncias.

```dart
import 'package:get_it/get_it.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dio/dio.dart';
// Importar Repositórios, DataSources, UseCases e Blocs

final sl = GetIt.instance; // Service Locator

Future<void> init() async {
  // 1. Core/External
  sl.registerLazySingleton(() => Dio());
  sl.registerLazySingleton(() => Supabase.instance.client);
  
  // 2. Data Sources
  // sl.registerLazySingleton<AuthRemoteDataSource>(
  //   () => AuthRemoteDataSourceImpl(client: sl(), dio: sl()),
  // );
  // ... (Outros Data Sources)

  // 3. Repositories
  // sl.registerLazySingleton<AuthRepository>(
  //   () => AuthRepositoryImpl(remoteDataSource: sl()),
  // );
  // ...

  // 4. Use Cases
  // sl.registerLazySingleton(() => SignIn(sl()));
  // sl.registerLazySingleton(() => RegisterPoint(sl()));
  // ...

  // 5. Blocs/Cubits
  // sl.registerFactory(() => AuthBloc(signIn: sl(), signOut: sl()));
  // ...
}
```

## 3. Camada Domain (`lib/domain`)

### 3.1. Entities (`lib/domain/entities`)

(Conforme definido no guia inicial, mas repetido para completude)

**`profile_entity.dart`**
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

**`point_entity.dart`**
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

### 3.2. Repositories (Interfaces) (`lib/domain/repositories`)

**`auth_repository.dart`**
```dart
import 'package:dartz/dartz.dart'; // Usar dartz para tratamento de erros (Failure/Success)
import '../../core/errors/failures.dart';
import '../entities/profile_entity.dart';

abstract class AuthRepository {
  Future<Either<Failure, ProfileEntity>> signIn(String email, String password);
  Future<Either<Failure, void>> signOut();
  Future<Either<Failure, ProfileEntity>> getProfile();
  Stream<AuthState> get authStateChanges;
}
```

**`point_repository.dart`**
```dart
import 'dart:io';
import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/point_entity.dart';
import '../entities/geofence_settings_entity.dart';

abstract class PointRepository {
  Future<Either<Failure, PointEntity>> registerPoint({
    required PointType type,
    required double lat,
    required double lon,
    required double accuracyM,
    required File photo,
    required String fingerprint,
  });
  
  Future<Either<Failure, GeofenceSettingsEntity>> getGeofenceSettings();
  
  Future<Either<Failure, List<PointEntity>>> getHistory(DateTime startDate, DateTime endDate);
  
  // Métodos para modo offline
  Future<Either<Failure, void>> saveOfflinePoint(PointEntity point);
  Future<Either<Failure, List<PointEntity>>> getOfflinePoints();
  Future<Either<Failure, void>> deleteOfflinePoint(String id);
}
```

### 3.3. Use Cases (`lib/domain/usecases`)

**`register_point.dart`**
```dart
import 'dart:io';
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../../core/usecases/usecase.dart';
import '../entities/point_entity.dart';
import '../repositories/point_repository.dart';

class RegisterPoint implements UseCase<PointEntity, RegisterPointParams> {
  final PointRepository repository;

  RegisterPoint(this.repository);

  @override
  Future<Either<Failure, PointEntity>> call(RegisterPointParams params) async {
    // Lógica de negócio: verificar se o usuário tem permissão, etc.
    return await repository.registerPoint(
      type: params.type,
      lat: params.lat,
      lon: params.lon,
      accuracyM: params.accuracyM,
      photo: params.photo,
      fingerprint: params.fingerprint,
    );
  }
}

class RegisterPointParams extends Equatable {
  final PointType type;
  final double lat;
  final double lon;
  final double accuracyM;
  final File photo;
  final String fingerprint;

  const RegisterPointParams({
    required this.type,
    required this.lat,
    required this.lon,
    required this.accuracyM,
    required this.photo,
    required this.fingerprint,
  });

  @override
  List<Object?> get props => [type, lat, lon, accuracyM, photo, fingerprint];
}
```

## 4. Camada Data (`lib/data`)

### 4.1. Models (`lib/data/models`)

Estes modelos são usados para mapear JSON para Dart e vice-versa.

**`geofence_settings_model.dart`**
```dart
import 'package:json_annotation/json_annotation.dart';
import '../../domain/entities/geofence_settings_entity.dart';

part 'geofence_settings_model.g.dart';

@JsonSerializable()
class GeofenceSettingsModel extends GeofenceSettingsEntity {
  const GeofenceSettingsModel({
    required double centerLat,
    required double centerLon,
    required int radiusMeters,
    required int toleranceMinutes,
  }) : super(
          centerLat: centerLat,
          centerLon: centerLon,
          radiusMeters: radiusMeters,
          toleranceMinutes: toleranceMinutes,
        );

  factory GeofenceSettingsModel.fromJson(Map<String, dynamic> json) {
    // O Supabase retorna geofence_center como {lat: X, lng: Y}
    final center = json['geofence_center'] as Map<String, dynamic>;
    
    return GeofenceSettingsModel(
      centerLat: center['lat'] as double,
      centerLon: center['lng'] as double,
      radiusMeters: json['geofence_radius'] as int,
      toleranceMinutes: json['tolerance_minutes'] as int,
    );
  }
  
  // Não precisamos de toJson para este modelo, pois ele é apenas lido.
}
```
*(Lembre-se de rodar `flutter pub run build_runner build` para gerar o arquivo `.g.dart`)*

### 4.2. Remote Data Sources (`lib/data/datasources`)

**`point_remote_datasource.dart`**
```dart
import 'dart:io';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:mime/mime.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:crypto/crypto.dart';
import '../../core/errors/exceptions.dart';
import '../models/geofence_settings_model.dart';

abstract class PointRemoteDataSource {
  Future<Map<String, dynamic>> registerPoint({
    required String type,
    required double lat,
    required double lon,
    required double accuracyM,
    required File photo,
    required String fingerprint,
  });
  
  Future<GeofenceSettingsModel> fetchGeofenceSettings();
  
  Future<Map<String, dynamic>> verifyFace({
    required String imageHash,
    required String userId,
  });
}

class PointRemoteDataSourceImpl implements PointRemoteDataSource {
  final Dio dio;
  final SupabaseClient client;
  final String supabaseUrl = 'https://gfoogchxvxjfqwulgrbb.supabase.co';

  PointRemoteDataSourceImpl({required this.dio, required this.client});

  @override
  Future<GeofenceSettingsModel> fetchGeofenceSettings() async {
    final response = await client
        .from('company_settings')
        .select('*')
        .eq('id', 'default')
        .single();
        
    return GeofenceSettingsModel.fromJson(response);
  }

  @override
  Future<Map<String, dynamic>> registerPoint({
    required String type,
    required double lat,
    required double lon,
    required double accuracyM,
    required File photo,
    required String fingerprint,
  }) async {
    final uri = Uri.parse('$supabaseUrl/functions/v1/register-point');
    final token = client.auth.currentSession?.accessToken;
    final userId = client.auth.currentUser?.id;

    if (token == null || userId == null) {
      throw AuthException('User not authenticated.');
    }
    
    // 1. Preparar Metadados
    final metadata = {
      "user_id": userId,
      "type": type,
      "timestamp_local": DateTime.now().toIso8601String(),
      "timestamp_utc": DateTime.now().toUtc().toIso8601String(),
      "lat": lat,
      "lon": lon,
      "accuracy_m": accuracyM,
      "fingerprint": fingerprint,
      // Adicionar device_id e network_type aqui
    };

    // 2. Criar Multipart Form Data
    final mimeType = lookupMimeType(photo.path) ?? 'image/jpeg';
    
    final formData = FormData.fromMap({
      'metadata': jsonEncode(metadata), // Metadados como string JSON
      'photo': await MultipartFile.fromFile(
        photo.path,
        filename: photo.path.split('/').last,
        contentType: MediaType.parse(mimeType),
      ),
    });

    // 3. Enviar Requisição
    try {
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

      if (response.statusCode == 201 && response.data['success'] == true) {
        return response.data;
      } else {
        throw ServerException(response.data['error'] ?? 'Failed to register point');
      }
    } on DioException catch (e) {
      throw ServerException(e.response?.data['error'] ?? e.message);
    }
  }
  
  @override
  Future<Map<String, dynamic>> verifyFace({
    required String imageHash,
    required String userId,
  }) async {
    final uri = Uri.parse('$supabaseUrl/functions/v1/verify-face');
    final token = client.auth.currentSession?.accessToken;

    if (token == null) {
      throw AuthException('User not authenticated.');
    }
    
    try {
      final response = await dio.post(
        uri.toString(),
        data: {
          "image_hash": imageHash,
          "user_id": userId,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data;
      } else {
        throw ServerException(response.data['error'] ?? 'Facial verification failed');
      }
    } on DioException catch (e) {
      throw ServerException(e.response?.data['error'] ?? e.message);
    }
  }
}
```

### 4.3. Repositories (Implementação) (`lib/data/repositories`)

**`point_repository_impl.dart`**
```dart
import 'dart:io';
import 'package:dartz/dartz.dart';
import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/point_entity.dart';
import '../../domain/entities/geofence_settings_entity.dart';
import '../../domain/repositories/point_repository.dart';
import '../datasources/point_remote_datasource.dart';
import '../datasources/point_local_datasource.dart'; // Necessário para offline

class PointRepositoryImpl implements PointRepository {
  final PointRemoteDataSource remoteDataSource;
  final PointLocalDataSource localDataSource; // Exemplo de datasource local

  PointRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, PointEntity>> registerPoint({
    required PointType type,
    required double lat,
    required double lon,
    required double accuracyM,
    required File photo,
    required String fingerprint,
  }) async {
    try {
      // 1. Validação Facial (Opcional: pode ser feita antes ou depois do registro)
      final faceResult = await remoteDataSource.verifyFace(
        imageHash: fingerprint,
        userId: remoteDataSource.client.auth.currentUser!.id,
      );
      
      // 2. Registro do Ponto (Edge Function)
      final result = await remoteDataSource.registerPoint(
        type: type.name,
        lat: lat,
        lon: lon,
        accuracyM: accuracyM,
        photo: photo,
        fingerprint: fingerprint,
      );
      
      // Mapear o resultado da Edge Function para PointEntity
      // ... (Mapeamento de JSON para Entity)
      
      // Exemplo simplificado de retorno:
      final status = result['status'] == 'aprovado' ? PointStatus.registrado : PointStatus.pendente;
      
      final registeredPoint = PointEntity(
        id: 'temp_id', // O backend deve retornar o ID real
        userId: remoteDataSource.client.auth.currentUser!.id,
        type: type,
        timestampUtc: DateTime.now().toUtc(),
        latitude: lat,
        longitude: lon,
        accuracyM: accuracyM,
        status: status,
      );
      
      return Right(registeredPoint);
    } on ServerException catch (e) {
      // Se falhar, salvar offline
      // await localDataSource.saveOfflinePoint(pointModel);
      return Left(ServerFailure(e.message));
    } on AuthException catch (e) {
      return Left(AuthFailure(e.message));
    }
  }
  
  // Implementar outros métodos (getGeofenceSettings, getHistory, offline methods)
  // ...
}
```

## 5. Camada Presentation (`lib/presentation`)

### 5.1. Estrutura de Estado (BLoC)

Para o registro de ponto, usaremos um Cubit simples:

**`lib/presentation/bloc/point_cubit.dart`**
```dart
import 'dart:io';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../domain/entities/point_entity.dart';
import '../../../domain/usecases/register_point.dart';

// Estados
abstract class PointState extends Equatable {
  const PointState();
  @override
  List<Object> get props => [];
}

class PointInitial extends PointState {}
class PointLoading extends PointState {}
class PointSuccess extends PointState {
  final PointEntity point;
  const PointSuccess(this.point);
  @override
  List<Object> get props => [point];
}
class PointFailure extends PointState {
  final String message;
  const PointFailure(this.message);
  @override
  List<Object> get props => [message];
}

// Cubit
class PointCubit extends Cubit<PointState> {
  final RegisterPoint registerPoint;

  PointCubit({required this.registerPoint}) : super(PointInitial());

  Future<void> attemptRegisterPoint({
    required PointType type,
    required double lat,
    required double lon,
    required double accuracyM,
    required File photo,
    required String fingerprint,
  }) async {
    emit(PointLoading());
    
    final params = RegisterPointParams(
      type: type,
      lat: lat,
      lon: lon,
      accuracyM: accuracyM,
      photo: photo,
      fingerprint: fingerprint,
    );
    
    final result = await registerPoint(params);
    
    result.fold(
      (failure) => emit(PointFailure(failure.message)),
      (point) => emit(PointSuccess(point)),
    );
  }
}
```

### 5.2. Tela de Captura de Ponto (`lib/presentation/pages/camera_screen.dart`)

Esta tela deve integrar `camera`, `geolocator` e `google_mlkit_face_detection`.

**Lógica de Captura:**

1.  **Inicializar Câmera:** Configurar a câmera frontal.
2.  **Liveness Detection:** Usar `google_mlkit_face_detection` para garantir que o rosto detectado esteja vivo (ex: pedir para piscar ou mover a cabeça).
3.  **Capturar Localização:** Obter coordenadas GPS (`geolocator`).
4.  **Validação de Geofence (Cliente):** Comparar as coordenadas com as configurações obtidas via `getGeofenceSettings` (Domain Layer). Se estiver fora, emitir um aviso, mas permitir o registro (que será marcado como `PENDENTE` no backend).
5.  **Gerar Hash:** Calcular o SHA256 da imagem capturada (`crypto` package).
6.  **Chamar BLoC:** Disparar `PointCubit.attemptRegisterPoint`.

## 6. Segurança e Modo Offline

### 6.1. Armazenamento Seguro

Use `flutter_secure_storage` para armazenar o JWT e o PIN de biometria.

### 6.2. Sincronização Offline

**`lib/data/datasources/point_local_datasource.dart`**

Esta classe deve usar `sqflite_sqlcipher` para armazenar os objetos `PointModel` que falharam no upload.

**`lib/core/services/sync_service.dart`**

Este serviço deve ser inicializado com `workmanager` (para Android/iOS) para rodar periodicamente (ex: a cada 15 minutos) e tentar enviar os pontos pendentes do `PointLocalDataSource` para o `PointRemoteDataSource`.

```dart
// Exemplo de inicialização do WorkManager no main.dart
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    // Inicializar DI aqui
    // final repository = sl<PointRepository>();
    // final points = await repository.getOfflinePoints();
    // Tentar registrar cada ponto
    return Future.value(true); // Retorna sucesso para o WorkManager
  });
}
```

## 7. Integração com Supabase

### 7.1. Inicialização

No seu `main.dart`, inicialize o Supabase:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicialização do Supabase
  await Supabase.initialize(
    url: 'https://gfoogchxvxjfqwulgrbb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb29nY2h4dnhqZnF3dWxncmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg3ODIsImV4cCI6MjA3NzIzNDc4Mn0.ZERsAMY-0EZ2jWg3j2gnhM6-sYIgEouWRYkKSW9LT8M',
    authFlowType: AuthFlowType.pkce, // Recomendado para apps mobile
  );
  
  // Inicialização do DI
  await init(); 
  
  runApp(const MyApp());
}
```

### 7.2. Endpoints de Edge Functions

Lembre-se de usar os URLs completos para as chamadas Dio:

*   **Registro de Ponto:** `https://gfoogchxvxjfqwulgrbb.supabase.co/functions/v1/register-point`
*   **Verificação Facial:** `https://gfoogchxvxjfqwulgrbb.supabase.co/functions/v1/verify-face`

## 8. Próximos Passos (Checklist)

| Funcionalidade | Status | Implementação |
| :--- | :--- | :--- |
| **Arquitetura** | ✅ | Clean Architecture (Domain, Data, Presentation) definida. |
| **Dependências** | ✅ | `pubspec.yaml` listado. |
| **Tema** | ✅ | `AppTheme` com cores corporativas. |
| **Modelos** | ✅ | Entities e Models Dart definidos. |
| **Auth** | ⬜ | Implementar `AuthRemoteDataSource` usando `supabase_flutter` (signIn, signOut). |
| **Geolocalização** | ⬜ | Integrar `geolocator` e `getGeofenceSettings` (Use Case). |
| **Câmera/Liveness** | ⬜ | Implementar `CameraScreen` com `camera` e `google_mlkit_face_detection`. |
| **Registro de Ponto** | ✅ | `PointRemoteDataSource` configurado para `register-point` (Multipart). |
| **Verificação Facial** | ✅ | `PointRemoteDataSource` configurado para `verify-face` (JSON). |
| **Offline** | ⬜ | Implementar `PointLocalDataSource` (`sqflite_sqlcipher`) e `SyncService` (`workmanager`). |
| **Segurança** | ⬜ | Implementar lógica de PIN/Biometria e uso de `flutter_secure_storage`. |
| **CI/CD** | ⬜ | Configurar Codemagic/Fastlane para automação de builds (fora do escopo do código, mas essencial). |

Este guia completo fornece a base estrutural e os exemplos de código necessários para iniciar o desenvolvimento do seu aplicativo Flutter.