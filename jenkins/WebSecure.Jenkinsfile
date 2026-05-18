pipeline {
    agent any

    environment {
        WEBFORT_API_KEY = credentials('websecure-api-key')
        WEBFORT_API_URL = 'https://api.websecure.io'
        TARGET_URL = 'https://staging.yourdomain.com'
    }

    stages {
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying application to staging...'
                // Your deployment steps here
            }
        }
        
        stage('WebSecure Security Scan') {
            steps {
                script {
                    echo "Triggering WebSecure scan for ${TARGET_URL}"
                    
                    def triggerPayload = """{"targetUrl":"${TARGET_URL}","scanType":"quick","scanDepth":2}"""
                    
                    def response = sh(script: """
                        curl -s -w "\\n%{http_code}" -X POST "${WEBFORT_API_URL}/api/integrations/cicd/trigger" \
                        -H "Authorization: Bearer ${WEBFORT_API_KEY}" \
                        -H "Content-Type: application/json" \
                        -d '${triggerPayload}'
                    """, returnStdout: true).trim()
                    
                    def lines = response.split('\n')
                    def body = lines[0]
                    
                    def scanJson = readJSON text: body
                    def scanId = scanJson.scanId
                    
                    echo "Scan triggered successfully. ID: ${scanId}"
                    
                    // Poll for completion
                    def isDone = false
                    while (!isDone) {
                        sleep time: 10, unit: 'SECONDS'
                        
                        def statusResp = sh(script: """
                            curl -s -X GET "${WEBFORT_API_URL}/api/integrations/cicd/status/${scanId}" \
                            -H "Authorization: Bearer ${WEBFORT_API_KEY}"
                        """, returnStdout: true).trim()
                        
                        def statusJson = readJSON text: statusResp
                        echo "Scan status: ${statusJson.status}"
                        
                        if (statusJson.status == 'completed' || statusJson.status == 'failed') {
                            isDone = true
                            
                            def critical = statusJson.vulnerabilities.critical
                            def high = statusJson.vulnerabilities.high
                            
                            echo "Results: Critical: ${critical}, High: ${high}"
                            
                            if (statusJson.passed == true) {
                                echo "WebSecure scan passed!"
                            } else {
                                error("WebSecure scan failed. Critical or High vulnerabilities found.")
                            }
                        }
                    }
                }
            }
        }
    }
}
